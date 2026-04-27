import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { SavedParamTemplate } from "./types";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: SavedParamTemplate) => void;
  sourceTemplateId: string;
  sourceTemplateName: string;
  params: Record<string, unknown>;
  normalizedParams: Record<string, unknown>;
  mediaType: "image" | "video" | "both";
}

export function SaveAsTemplateDialog({
  open,
  onClose,
  onSave,
  sourceTemplateId,
  sourceTemplateName,
  params,
  normalizedParams,
  mediaType,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;

    const template: SavedParamTemplate = {
      id: `saved-${Date.now()}`,
      name: name.trim(),
      sourceTemplateId,
      sourceTemplateName,
      params,
      normalizedParams,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mediaType,
    };

    onSave(template);
    setName("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>保存为模版</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            label="模版名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            placeholder="例如: 公司水印配置"
          />

          <Typography variant="body2" color="text.secondary">
            来源模版: {sourceTemplateName}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            参数数量: {Object.keys(params).length} 项
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button onClick={handleSave} variant="contained" disabled={!name.trim()}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}