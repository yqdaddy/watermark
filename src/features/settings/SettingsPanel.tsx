import {
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useRuntimeSettings } from "./runtimeSettings";

export function SettingsPanel() {
  const { settings, setUseMainThreadRender, setMaxConcurrency, resetSettings } =
    useRuntimeSettings();

  return (
    <Stack spacing={2.2}>
      <Typography variant="h4" fontWeight={800}>
        设置
      </Typography>
      <Typography color="text.secondary">配置运行模式与并发参数。</Typography>

      <Card sx={{ borderRadius: 1.25 }}>
        <CardContent>
          <Stack spacing={1.4}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.useMainThreadRender}
                  onChange={(event) => setUseMainThreadRender(event.target.checked)}
                />
              }
              label="使用主线程渲染（仅调试）"
            />

            <TextField
              type="number"
              label="最大并发数"
              value={settings.maxConcurrency}
              inputProps={{ min: 1, step: 1 }}
              onChange={(event) => setMaxConcurrency(Number(event.target.value))}
              helperText="默认会根据设备内存和 CPU 自动估算，仅在 Worker 渲染模式下生效。"
            />

            <Divider />

            <Button variant="outlined" color="warning" onClick={resetSettings}>
              重置设置
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 1.25 }}>
        <CardContent>
          <Typography fontWeight={700}>关于</Typography>
          <Typography variant="body2" color="text.secondary">
            版本: v{__APP_VERSION__}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
