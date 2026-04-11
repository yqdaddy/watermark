import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Fab,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useUnsavedChangesGuard } from "../../unsavedChangesGuard";
import { CodeEditor } from "../../editor/CodeEditor";
import {
  defaultTemplateFiles,
  exportTemplateZip,
  importTemplateZip,
  type TemplateFiles,
} from "../../utils/zip/templateZip";

interface TreeItem {
  type: "folder" | "file";
  name: string;
  path: string;
  depth: number;
}

function buildFolders(files: TemplateFiles): Set<string> {
  const folders = new Set<string>();
  for (const path of Object.keys(files)) {
    const parts = path.split("/");
    if (parts.length <= 1) continue;
    for (let i = 1; i < parts.length; i += 1) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }
  return folders;
}

function buildTree(files: TemplateFiles, folders: Set<string>): TreeItem[] {
  const items: TreeItem[] = [];
  const folderList = Array.from(folders).sort();

  for (const folder of folderList) {
    const segments = folder.split("/");
    items.push({
      type: "folder",
      name: segments.at(-1) ?? folder,
      path: folder,
      depth: segments.length - 1,
    });
  }

  const fileList = Object.keys(files).sort();
  for (const file of fileList) {
    const segments = file.split("/");
    items.push({
      type: "file",
      name: segments.at(-1) ?? file,
      path: file,
      depth: segments.length - 1,
    });
  }

  return items;
}

function folderAncestors(path: string): string[] {
  const segments = path.split("/");
  const results: string[] = [];
  for (let i = 1; i < segments.length; i += 1) {
    results.push(segments.slice(0, i).join("/"));
  }
  return results;
}

function pathBase(path: string): string {
  const segments = path.split("/");
  if (segments.length <= 1) return "";
  return segments.slice(0, -1).join("/");
}

function replacePrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix;
  if (!path.startsWith(`${oldPrefix}/`)) return path;
  return `${newPrefix}${path.slice(oldPrefix.length)}`;
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

export function TemplateEditor() {
  const { setHasUnsavedChanges, confirmNavigation } = useUnsavedChangesGuard();
  const [mode, setMode] = useState<"welcome" | "editor">("welcome");
  const [files, setFiles] = useState<TemplateFiles>(defaultTemplateFiles);
  const [folders, setFolders] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string>("index.ts");
  const [openTree, setOpenTree] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState<false | "file" | "folder">(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<TreeItem | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [editorError, setEditorError] = useState("");

  const treeItems = useMemo(() => buildTree(files, folders), [files, folders]);
  const activeContent = files[activePath] ?? "";
  const language = activePath.endsWith(".css") ? "css" : activePath.endsWith(".ts") ? "ts" : "txt";

  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  function onFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void importTemplateZip(file).then((imported) => {
      const importedFolders = buildFolders(imported);
      setFiles(imported);
      setFolders(importedFolders);
      setExpandedFolders(new Set(importedFolders));
      setSelectedFolder(null);
      const first = Object.keys(imported)[0] ?? "index.ts";
      setActivePath(first);
      setMode("editor");
      setEditorError("");
      setHasUnsavedChanges(false);
    });
  }

  function startWithEmptyTemplate() {
    setFiles(defaultTemplateFiles);
    setFolders(new Set());
    setExpandedFolders(new Set());
    setSelectedFolder(null);
    setActivePath("index.ts");
    setMode("editor");
    setEditorError("");
    setHasUnsavedChanges(true);
  }

  async function onExport() {
    const blob = await exportTemplateZip(files);
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "template.zip";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
    setHasUnsavedChanges(false);
  }

  function isVisible(item: TreeItem): boolean {
    const ancestors = folderAncestors(item.path);
    if (item.type === "folder") ancestors.pop();
    return ancestors.every((folder) => expandedFolders.has(folder));
  }

  function createEntry(kind: "file" | "folder") {
    const name = normalizePath(pendingName.trim());
    if (!name) {
      setEditorError("请输入名称");
      return;
    }

    const base = selectedFolder ? `${selectedFolder}/` : "";
    const fullPath = normalizePath(base + name);

    if (kind === "file") {
      if (Object.prototype.hasOwnProperty.call(files, fullPath)) {
        setEditorError("同名文件已存在");
        return;
      }
      setFiles((prev) => ({ ...prev, [fullPath]: "" }));
      const ancestors = folderAncestors(fullPath);
      if (ancestors.length > 0) {
        setFolders((prev) => new Set([...prev, ...ancestors]));
        setExpandedFolders((prev) => new Set([...prev, ...ancestors]));
      }
      setActivePath(fullPath);
      setHasUnsavedChanges(true);
    } else {
      if (folders.has(fullPath)) {
        setEditorError("同名文件夹已存在");
        return;
      }
      const ancestors = [...folderAncestors(fullPath), fullPath];
      setFolders((prev) => new Set([...prev, ...ancestors]));
      setExpandedFolders((prev) => new Set([...prev, ...ancestors]));
      setSelectedFolder(fullPath);
      setHasUnsavedChanges(true);
    }

    setPendingName("");
    setOpenCreateDialog(false);
    setEditorError("");
  }

  function renamePath(target: TreeItem, nextName: string) {
    const cleanName = normalizePath(nextName.trim());
    if (!cleanName) {
      setEditorError("请输入名称");
      return;
    }

    const base = pathBase(target.path);
    const nextPath = normalizePath(base ? `${base}/${cleanName}` : cleanName);

    if (target.type === "file") {
      if (nextPath !== target.path && Object.prototype.hasOwnProperty.call(files, nextPath)) {
        setEditorError("同名文件已存在");
        return;
      }

      const nextFiles: TemplateFiles = {};
      for (const [filePath, content] of Object.entries(files)) {
        nextFiles[filePath === target.path ? nextPath : filePath] = content;
      }
      setFiles(nextFiles);

      if (activePath === target.path) {
        setActivePath(nextPath);
      }
      setHasUnsavedChanges(true);
    } else {
      if (nextPath !== target.path && folders.has(nextPath)) {
        setEditorError("同名文件夹已存在");
        return;
      }

      const nextFiles: TemplateFiles = {};
      for (const [filePath, content] of Object.entries(files)) {
        nextFiles[replacePrefix(filePath, target.path, nextPath)] = content;
      }

      const nextFolders = new Set<string>();
      for (const folder of folders) {
        nextFolders.add(replacePrefix(folder, target.path, nextPath));
      }

      const nextExpanded = new Set<string>();
      for (const folder of expandedFolders) {
        nextExpanded.add(replacePrefix(folder, target.path, nextPath));
      }

      setFiles(nextFiles);
      setFolders(nextFolders);
      setExpandedFolders(nextExpanded);

      if (
        selectedFolder &&
        (selectedFolder === target.path || selectedFolder.startsWith(`${target.path}/`))
      ) {
        setSelectedFolder(replacePrefix(selectedFolder, target.path, nextPath));
      }

      if (activePath === target.path || activePath.startsWith(`${target.path}/`)) {
        setActivePath(replacePrefix(activePath, target.path, nextPath));
      }
      setHasUnsavedChanges(true);
    }

    setEditorError("");
    setOpenRenameDialog(false);
    setMenuTarget(null);
  }

  function toggleFolder(path: string) {
    setSelectedFolder(path);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function onDeleteFile(path: string) {
    if (Object.keys(files).length <= 1) return;
    const next = { ...files };
    delete next[path];
    const fallback = Object.keys(next)[0];
    setFiles(next);
    setActivePath(fallback);
    setHasUnsavedChanges(true);
  }

  function onDeleteFolder(path: string) {
    const nextFiles: TemplateFiles = {};
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath === path || filePath.startsWith(`${path}/`)) continue;
      nextFiles[filePath] = content;
    }

    if (Object.keys(nextFiles).length === 0) return;

    const nextFolders = new Set<string>();
    for (const folder of folders) {
      if (folder === path || folder.startsWith(`${path}/`)) continue;
      nextFolders.add(folder);
    }

    const nextExpanded = new Set<string>();
    for (const folder of expandedFolders) {
      if (folder === path || folder.startsWith(`${path}/`)) continue;
      nextExpanded.add(folder);
    }

    setFiles(nextFiles);
    setFolders(nextFolders);
    setExpandedFolders(nextExpanded);

    if (activePath === path || activePath.startsWith(`${path}/`)) {
      setActivePath(Object.keys(nextFiles)[0]);
    }

    if (selectedFolder === path || selectedFolder?.startsWith(`${path}/`)) {
      setSelectedFolder(null);
    }
    setHasUnsavedChanges(true);
  }

  function openItemMenu(event: React.MouseEvent<HTMLElement>, item: TreeItem) {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuTarget(item);
  }

  function closeItemMenu() {
    setMenuAnchorEl(null);
    setMenuTarget(null);
  }

  if (mode === "welcome") {
    return (
      <Stack spacing={2.2}>
        <Typography variant="h4" fontWeight={800}>
          创作
        </Typography>
        <Typography color="text.secondary">先上传模板 Zip，或从空模板开始。</Typography>

        <Card sx={{ borderRadius: 1.25 }}>
          <CardContent>
            <Stack
              spacing={1.2}
              alignItems="center"
              justifyContent="center"
              sx={{ minHeight: 280 }}
            >
              <UploadFileRoundedIcon sx={{ fontSize: 48 }} />
              <Typography variant="h5" fontWeight={700} textAlign="center">
                上传模板 Zip
              </Typography>
              <Button
                component="label"
                variant="contained"
                size="large"
                startIcon={<UploadFileRoundedIcon />}
              >
                选择 Zip 文件
                <input hidden accept=".zip" type="file" onChange={(event) => onFileImport(event)} />
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Button
          sx={{ alignSelf: "center" }}
          size="small"
          variant="text"
          onClick={startWithEmptyTemplate}
        >
          使用空模板开始
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>
        创作
      </Typography>
      <Typography color="text.secondary">编辑模板文件并导出为 zip。</Typography>

      {editorError ? <Alert severity="warning">{editorError}</Alert> : null}

      <Card sx={{ borderRadius: 1.25 }}>
        <CardContent>
          <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
            <Typography
              fontWeight={700}
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                pr: 1,
              }}
            >
              {activePath}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton title="切换文件" onClick={() => setOpenTree(true)}>
                <FolderOpenRoundedIcon />
              </IconButton>
              <Button
                variant="text"
                onClick={() => {
                  if (!confirmNavigation()) return;
                  setHasUnsavedChanges(false);
                  setMode("welcome");
                }}
              >
                返回欢迎页
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Fab
        color="primary"
        aria-label="保存模板"
        onClick={() => void onExport()}
        sx={{ position: "fixed", right: 12, bottom: 138 }}
      >
        <SaveRoundedIcon />
      </Fab>

      <Card sx={{ borderRadius: 1.25 }}>
        <CardContent>
          <Stack spacing={1.4}>
            <CodeEditor
              value={activeContent}
              language={language}
              onChange={(value: string) => {
                setFiles((prev) => ({ ...prev, [activePath]: value }));
                setHasUnsavedChanges(true);
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Dialog fullWidth open={openTree} onClose={() => setOpenTree(false)}>
        <DialogTitle>文件管理器</DialogTitle>
        <DialogContent>
          <Stack spacing={1.6}>
            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
              <IconButton
                color="primary"
                title="创建文件"
                onClick={() => {
                  setPendingName("");
                  setOpenCreateDialog("file");
                }}
              >
                <NoteAddRoundedIcon />
              </IconButton>
              <IconButton
                color="primary"
                title="创建文件夹"
                onClick={() => {
                  setPendingName("");
                  setOpenCreateDialog("folder");
                }}
              >
                <CreateNewFolderRoundedIcon />
              </IconButton>
            </Box>

            <Paper
              variant="outlined"
              sx={{
                borderRadius: 1.25,
                p: 1,
                maxHeight: 360,
                overflow: "auto",
                background: "linear-gradient(180deg, rgba(247,251,255,.95), rgba(235,244,255,.78))",
              }}
              onClick={() => setSelectedFolder(null)}
            >
              <Stack spacing={0.4}>
                {treeItems.filter(isVisible).map((item) => (
                  <Box
                    key={item.type + item.path}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item.type === "folder") {
                        toggleFolder(item.path);
                        return;
                      }
                      setActivePath(item.path);
                      setOpenTree(false);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      minHeight: 42,
                      width: "100%",
                      gap: 1,
                      px: 1,
                      py: 0.65,
                      borderRadius: 1,
                      ml: item.depth * 2,
                      background:
                        item.type === "folder" && selectedFolder === item.path
                          ? "rgba(53, 94, 201, .12)"
                          : "transparent",
                      border:
                        item.type === "folder" && selectedFolder === item.path
                          ? "1px solid rgba(53, 94, 201, .35)"
                          : "1px solid transparent",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", width: 40, flexShrink: 0 }}>
                      {item.type === "folder" ? (
                        expandedFolders.has(item.path) ? (
                          <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: "#355ec9" }} />
                        ) : (
                          <ChevronRightRoundedIcon sx={{ fontSize: 16, color: "#355ec9" }} />
                        )
                      ) : (
                        <Box sx={{ width: 16 }} />
                      )}
                      {item.type === "folder" ? (
                        <FolderRoundedIcon sx={{ fontSize: 18, color: "#355ec9" }} />
                      ) : (
                        <DescriptionRoundedIcon sx={{ fontSize: 18, color: "#1b6a52" }} />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        flexShrink: 0,
                        width: 76,
                        justifyContent: "flex-end",
                      }}
                    >
                      {item.type === "file" && item.path === activePath ? (
                        <EditRoundedIcon sx={{ fontSize: 18, color: "#c28a00" }} />
                      ) : null}
                      <IconButton size="small" onClick={(event) => openItemMenu(event, item)}>
                        <MoreVertRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
      </Dialog>

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={closeItemMenu}>
        <MenuItem
          onClick={() => {
            if (!menuTarget) return;
            setPendingName(menuTarget.name);
            setOpenRenameDialog(true);
            closeItemMenu();
          }}
        >
          <ListItemIcon>
            <EditRoundedIcon fontSize="small" />
          </ListItemIcon>
          重命名
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuTarget) return;
            if (menuTarget.type === "folder") {
              onDeleteFolder(menuTarget.path);
            } else {
              onDeleteFile(menuTarget.path);
            }
            closeItemMenu();
          }}
        >
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          删除
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(openCreateDialog)}
        onClose={() => setOpenCreateDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{openCreateDialog === "folder" ? "创建文件夹" : "创建文件"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.4} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              size="small"
              label={openCreateDialog === "folder" ? "文件夹名称" : "文件名"}
              placeholder={
                openCreateDialog === "folder"
                  ? "new-folder 或 nested/utils"
                  : "new-file.ts 或 nested/utils.ts"
              }
              value={pendingName}
              onChange={(event) => setPendingName(event.target.value)}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="text" onClick={() => setOpenCreateDialog(false)}>
                取消
              </Button>
              <Button
                variant="contained"
                onClick={() => createEntry(openCreateDialog === "folder" ? "folder" : "file")}
              >
                确认
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openRenameDialog}
        onClose={() => setOpenRenameDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>重命名</DialogTitle>
        <DialogContent>
          <Stack spacing={1.4} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              当前项: {menuTarget?.path ?? ""}
            </Typography>
            <TextField
              autoFocus
              size="small"
              label="新名称"
              value={pendingName}
              onChange={(event) => setPendingName(event.target.value)}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="text" onClick={() => setOpenRenameDialog(false)}>
                取消
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (!menuTarget) return;
                  renamePath(menuTarget, pendingName);
                }}
              >
                确认
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
