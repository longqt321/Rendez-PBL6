-- Hợp đồng API (`placeSchema.priceLevel`) chỉ có 1 | 2 | 3. Trước đây DB không
-- ràng buộc gì, còn `toPlaceDto` phải `Math.min(3, Math.max(1, ...))` để che dữ
-- liệu sai — đó là band-aid: dữ liệu hỏng vẫn ghi được và bị sửa lặng lẽ khi đọc.
-- Ràng buộc ở DB là chốt cuối, đọc thẳng giá trị thật.
ALTER TABLE places
  ADD CONSTRAINT places_price_level_check CHECK (price_level BETWEEN 1 AND 3);
