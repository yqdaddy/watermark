import { BottomNavigation, BottomNavigationAction, Box, Paper } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUnsavedChangesGuard } from "../../unsavedChangesGuard";

const routes = [
  { label: "开始", value: "/", icon: <AutoAwesomeIcon /> },
  { label: "创作", value: "/create", icon: <EditNoteIcon /> },
  { label: "设置", value: "/settings", icon: <SettingsSuggestOutlinedIcon /> },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmNavigation, navigationBlocked } = useUnsavedChangesGuard();
  const current = routes.find((item) => location.pathname === item.value)?.value ?? "/";

  return (
    <Box sx={{ minHeight: "100svh", pb: 10, background: "var(--app-bg)" }}>
      <Box sx={{ maxWidth: 920, margin: "0 auto", px: { xs: 2.25, sm: 3.25 }, pt: { xs: 2.25, sm: 3 } }}>
        <Outlet />
      </Box>

      <Paper
        elevation={8}
        sx={{ position: "fixed", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        <BottomNavigation
          showLabels
          value={current}
          onChange={(_, value: string) => {
            if (value === current) return;
            if (navigationBlocked) return;
            if (!confirmNavigation()) return;
            navigate(value);
          }}
          sx={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
        >
          {routes.map((route) => (
            <BottomNavigationAction
              key={route.value}
              label={route.label}
              value={route.value}
              icon={route.icon}
              disabled={navigationBlocked && route.value !== current}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
