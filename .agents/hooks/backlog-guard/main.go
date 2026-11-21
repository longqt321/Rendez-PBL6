package main

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"os/exec"
	"strings"
)

type stopInput struct {
	TerminationReason  string `json:"terminationReason"`
	ContinuationActive bool   `json:"continuationActive"`
	Cwd                string `json:"cwd"`
}

type stopOutput struct {
	Decision string `json:"decision,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

var trackedPrefixes = []string{
	"frontend/src/",
	"backend/src/",
	"backend/prisma/",
	"backend/data/",
	"packages/",
}

func isTrackedCodePath(path string) bool {
	for _, prefix := range trackedPrefixes {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

func main() {
	raw, err := io.ReadAll(os.Stdin)
	if err != nil {
		_, _ = os.Stdout.WriteString("{}")
		return
	}

	var in stopInput
	if err := json.Unmarshal(raw, &in); err != nil {
		_, _ = os.Stdout.WriteString("{}")
		return
	}

	if in.ContinuationActive || in.TerminationReason != "NO_TOOL_CALL" || in.Cwd == "" {
		_, _ = os.Stdout.WriteString("{}")
		return
	}

	cmd := exec.Command("git", "-C", in.Cwd, "status", "--porcelain")
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		_, _ = os.Stdout.WriteString("{}")
		return
	}

	hasCodeChange := false
	backlogUpdated := false
	for _, line := range strings.Split(out.String(), "\n") {
		if len(line) < 4 {
			continue
		}
		path := strings.TrimSpace(line[3:])
		if idx := strings.LastIndex(path, " -> "); idx != -1 {
			path = path[idx+4:]
		}
		if path == "docs/BACKLOG.md" {
			backlogUpdated = true
		} else if isTrackedCodePath(path) {
			hasCodeChange = true
		}
	}

	if hasCodeChange && !backlogUpdated {
		resp, _ := json.Marshal(stopOutput{
			Decision: "continue",
			Reason: "[backlog-guard] Phát hiện thay đổi mã nguồn/dữ liệu trong workspace nhưng docs/BACKLOG.md chưa được cập nhật. " +
				"Hãy đối chiếu các thay đổi với docs/BACKLOG.md để đánh dấu mục đã xong, cập nhật số liệu hoặc bổ sung việc phát sinh (nếu có) trước khi kết thúc.",
		})
		_, _ = os.Stdout.Write(resp)
		return
	}

	_, _ = os.Stdout.WriteString("{}")
}
