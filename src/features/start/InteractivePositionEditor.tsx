import { Box, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";

interface InteractivePositionEditorProps {
  imageUrl: string | null;
  mediaWidth: number;
  mediaHeight: number;
  coordKey: string;
  coordValue: { x: number; y: number };
  onCoordChange: (key: string, x: number, y: number) => void;
  disabled?: boolean;
}

export function InteractivePositionEditor({
  imageUrl,
  mediaWidth,
  mediaHeight,
  coordKey,
  coordValue,
  onCoordChange,
  disabled = false,
}: InteractivePositionEditorProps) {
  const [dragging, setDragging] = useState(false);
  const [dragCoord, setDragCoord] = useState<{ x: number; y: number } | null>(null);

  const hasResolution = mediaWidth > 0 && mediaHeight > 0;
  const displayCoord = dragCoord ?? coordValue;

  const xPercent = hasResolution
    ? Math.max(0, Math.min(100, (displayCoord.x / Math.max(1, mediaWidth)) * 100))
    : 0;
  const yPercent = hasResolution
    ? Math.max(0, Math.min(100, (displayCoord.y / Math.max(1, mediaHeight)) * 100))
    : 0;

  const readPointerCoord = useCallback(
    (clientX: number, clientY: number, box: DOMRect) => {
      const ratioX = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
      const ratioY = Math.max(0, Math.min(1, (clientY - box.top) / box.height));
      return {
        x: ratioX * mediaWidth,
        y: ratioY * mediaHeight,
      };
    },
    [mediaWidth, mediaHeight],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || !hasResolution) return;
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      const newCoord = readPointerCoord(event.clientX, event.clientY, rect);
      setDragCoord(newCoord);
    },
    [disabled, hasResolution, readPointerCoord],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || !hasResolution) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const newCoord = readPointerCoord(event.clientX, event.clientY, rect);
      setDragCoord(newCoord);
    },
    [disabled, hasResolution, readPointerCoord],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (dragCoord) {
        onCoordChange(coordKey, dragCoord.x, dragCoord.y);
      }
      setDragCoord(null);
      setDragging(false);
    },
    [coordKey, dragCoord, onCoordChange],
  );

  const handlePointerCancel = useCallback(() => {
    setDragCoord(null);
    setDragging(false);
  }, []);

  const panelWidth = 520;
  const panelHeight = hasResolution
    ? Math.max(140, Math.min(240, (panelWidth * mediaHeight) / mediaWidth))
    : 180;

  return (
    <Stack spacing={0.8}>
      <Typography variant="subtitle2" fontWeight={700}>
        水印位置调整
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="space-between">
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          当前坐标 ({Math.round(displayCoord.x)}, {Math.round(displayCoord.y)})
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {hasResolution
            ? `参考分辨率 ${mediaWidth} x ${mediaHeight}`
            : "正在读取媒体分辨率..."}
        </Typography>
      </Stack>

      <Box
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: panelWidth,
          height: panelHeight,
          alignSelf: "center",
          borderRadius: 1.2,
          border: "1px solid rgba(61, 86, 164, .35)",
          overflow: "hidden",
          background: imageUrl
            ? `url(${imageUrl}) center/contain no-repeat`
            : "repeating-linear-gradient(0deg, rgba(61,86,164,.12) 0 1px, transparent 1px 20px), repeating-linear-gradient(90deg, rgba(61,86,164,.12) 0 1px, transparent 1px 20px), linear-gradient(180deg, rgba(255,255,255,.62), rgba(231,239,255,.56))",
          touchAction: "none",
          cursor: disabled ? "not-allowed" : hasResolution ? "crosshair" : "wait",
          opacity: disabled ? 0.5 : hasResolution ? 1 : 0.66,
          transition: "opacity 0.2s",
        }}
      >
        {/* 十字线 */}
        <Box
          sx={{
            position: "absolute",
            left: `${xPercent}%`,
            top: 0,
            bottom: 0,
            borderLeft: dragging ? "2px solid rgba(255, 100, 100, .6)" : "1px solid rgba(132, 164, 255, .4)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: `${yPercent}%`,
            left: 0,
            right: 0,
            borderTop: dragging ? "2px solid rgba(255, 100, 100, .6)" : "1px solid rgba(132, 164, 255, .4)",
            pointerEvents: "none",
          }}
        />

        {/* 中心点 */}
        <Box
          sx={{
            position: "absolute",
            left: `${xPercent}%`,
            top: `${yPercent}%`,
            width: dragging ? 18 : 14,
            height: dragging ? 18 : 14,
            borderRadius: "50%",
            backgroundColor: dragging ? "#ff6464" : "#6d94ff",
            border: "2px solid #fff",
            boxShadow: dragging ? "0 0 0 3px rgba(255,100,100,.6)" : "0 0 0 2px rgba(109,148,255,.45)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            transition: dragging ? "none" : "all 0.2s",
          }}
        />

        {/* 拖拽提示 */}
        {dragging ? (
          <Box
            sx={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "rgba(0, 0, 0, 0.7)",
              color: "white",
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            拖拽中...
          </Box>
        ) : null}
      </Box>

      {imageUrl ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          直接在图片上拖拽调整水印位置
        </Typography>
      ) : null}
    </Stack>
  );
}