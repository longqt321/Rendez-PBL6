import { Client } from "pg"
import { env } from "../env"
import { logger } from "./logger"

export type BusListener = (payload: string) => void

class PostgresPubSub {
  private listenerClient: Client | null = null
  private publisherClient: Client | null = null
  private listeners = new Map<string, Set<BusListener>>()
  private activeChannels = new Set<string>()
  private isConnecting = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  async init(): Promise<void> {
    if (this.listenerClient && this.publisherClient) return
    if (this.isConnecting) return

    this.isConnecting = true
    try {
      this.listenerClient = new Client({ connectionString: env.DATABASE_URL })
      this.publisherClient = new Client({ connectionString: env.DATABASE_URL })

      await Promise.all([this.listenerClient.connect(), this.publisherClient.connect()])

      this.listenerClient.on("notification", (msg) => {
        if (!msg.channel) return
        const set = this.listeners.get(msg.channel)
        if (!set) return
        for (const fn of set) {
          try {
            fn(msg.payload ?? "")
          } catch (err) {
            logger.error({ err, channel: msg.channel }, "Lỗi khi xử lý pubsub event")
          }
        }
      })

      this.listenerClient.on("error", (err) => {
        logger.error({ err }, "Postgres PubSub listener gặp lỗi — lập lịch kết nối lại")
        this.scheduleReconnect()
      })

      this.publisherClient.on("error", (err) => {
        logger.error({ err }, "Postgres PubSub publisher gặp lỗi — lập lịch kết nối lại")
        this.scheduleReconnect()
      })

      // Đăng ký lại toàn bộ channel nếu vừa reconnect
      for (const channel of this.activeChannels) {
        await this.listenerClient.query(`LISTEN ${channel}`).catch(() => {})
      }

      this.isConnecting = false
      logger.info("Postgres PubSub (LISTEN/NOTIFY) đã sẵn sàng")
    } catch (err) {
      this.isConnecting = false
      logger.error({ err }, "Không thể kết nối Postgres PubSub — sẽ thử lại sau 3s")
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.cleanup().then(() => this.init())
    }, 3000)
  }

  async subscribe(channel: string, listener: BusListener): Promise<() => void> {
    const sanitized = channel.replace(/[^a-zA-Z0-9_]/g, "_")
    let set = this.listeners.get(sanitized)
    if (!set) {
      set = new Set()
      this.listeners.set(sanitized, set)
    }
    set.add(listener)

    if (!this.activeChannels.has(sanitized)) {
      this.activeChannels.add(sanitized)
      if (this.listenerClient) {
        try {
          await this.listenerClient.query(`LISTEN ${sanitized}`)
        } catch (err) {
          logger.error({ err, channel: sanitized }, "Lỗi khi LISTEN channel")
        }
      }
    }

    return () => {
      const currentSet = this.listeners.get(sanitized)
      if (!currentSet) return
      currentSet.delete(listener)
      if (currentSet.size === 0) {
        this.listeners.delete(sanitized)
        this.activeChannels.delete(sanitized)
        if (this.listenerClient) {
          this.listenerClient.query(`UNLISTEN ${sanitized}`).catch(() => {})
        }
      }
    }
  }

  async publish(channel: string, payload: string = ""): Promise<void> {
    const sanitized = channel.replace(/[^a-zA-Z0-9_]/g, "_")
    if (this.publisherClient) {
      try {
        // Sử dụng quote_literal trong SQL để an toàn với payload JSON
        await this.publisherClient.query("SELECT pg_notify($1, $2)", [sanitized, payload])
      } catch (err) {
        logger.error({ err, channel: sanitized }, "Lỗi khi NOTIFY channel")
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    const lc = this.listenerClient
    const pc = this.publisherClient
    this.listenerClient = null
    this.publisherClient = null
    await Promise.all([lc?.end().catch(() => {}), pc?.end().catch(() => {})])
  }
}

export const pubsub = new PostgresPubSub()
