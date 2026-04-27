import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import {
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useState } from "react";
import type { SavedParamTemplate } from "./types";

interface SavedTemplatesListProps {
  templates: SavedParamTemplate[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function SavedTemplatesList({ templates, onDelete, onRename }: SavedTemplatesListProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingTemplate, setRenamingTemplate] = useState<SavedParamTemplate | null>(null);
  const [newName, setNewName] = useState("");

  const handleRenameClick = (template: SavedParamTemplate) => {
    setRenamingTemplate(template);
    setNewName(template.name);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = () => {
    if (renamingTemplate && newName.trim()) {
      onRename(renamingTemplate.id, newName.trim());
    }
    setRenameDialogOpen(false);
    setRenamingTemplate(null);
    setNewName("");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN");
  };

  if (templates.length === 0) {
    return (
      <Card sx={{ borderRadius: 1.25 }}>
        <CardContent>
          <Typography color="text.secondary">暂无保存的模版</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ borderRadius: 1.25 }}>
        <CardContent>
          <Typography fontWeight={700} gutterBottom>
            我的模版 ({templates.length})
          </Typography>
          <List>
            {templates.map((template) => (
              <ListItem
                key={template.id}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <IconButton edge="end" onClick={() => handleRenameClick(template)}>
                      <EditRoundedIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => onDelete(template.id)}>
                      <DeleteRoundedIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={template.name}
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      来源: {template.sourceTemplateName} | 创建: {formatDate(template.createdAt)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>重命名模版</DialogTitle>
        <DialogContent>
          <TextField
            label="新名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>取消</Button>
          <Button onClick={handleRenameConfirm} variant="contained" disabled={!newName.trim()}>
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}