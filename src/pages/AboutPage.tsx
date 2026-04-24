import { Card, CardContent, Stack, Typography } from "@mui/material";

export function AboutPage() {
  return (
    <Card sx={{ borderRadius: 1.25 }}>
      <CardContent>
        <Stack spacing={1.4}>
          <Typography variant="h4" fontWeight={800}>
            关于
          </Typography>

          <Typography color="text.secondary">
            开源免费、安全、可自定义的本地在线加水印工具。数据完全离线处理。
          </Typography>

          <Typography variant="body2" color="text.secondary">
            版本: v{__APP_VERSION__}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}