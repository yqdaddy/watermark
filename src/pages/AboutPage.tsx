import { Card, CardContent, Link, Stack, Typography } from "@mui/material";

export function AboutPage() {
  return (
    <Card sx={{ borderRadius: 1.25 }}>
      <CardContent>
        <Stack spacing={1.4}>
          <Typography variant="h4" fontWeight={800}>
            关于
          </Typography>

          <Typography color="text.secondary">Made with love by</Typography>

          <Typography variant="h6" fontWeight={700}>
            熊谷 凌 (FurryR)
          </Typography>

          <Stack spacing={0.8}>
            <Typography fontWeight={700}>联系方式</Typography>
            <Typography>
              GitHub:{" "}
              <Link href="https://github.com/FurryR" target="_blank" rel="noopener noreferrer">
                https://github.com/FurryR
              </Link>
            </Typography>
            <Typography>
              X:{" "}
              <Link href="https://x.com/im_furryr" target="_blank" rel="noopener noreferrer">
                @im_furryr
              </Link>
            </Typography>
            <Typography>
              Website:{" "}
              <Link href="https://furryr.is-a.dev" target="_blank" rel="noopener noreferrer">
                furryr.is-a.dev
              </Link>
            </Typography>
          </Stack>
          <Typography>
            协助托管：{" "}
            <Link href="https://github.com/foxderin" target="_blank" rel="noopener noreferrer">
              @foxderin (玻狸)
            </Link>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
