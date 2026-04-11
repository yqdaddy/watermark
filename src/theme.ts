import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
    h4: { fontWeight: 800, letterSpacing: -0.4 },
    h5: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  palette: {
    mode: "light",
    primary: { main: "#355ec9" },
    secondary: { main: "#1b6a52" },
    background: { default: "#f3f7ff", paper: "#ffffff" },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: "0 10px 36px rgba(16, 52, 131, .08)",
          border: "1px solid rgba(63, 86, 146, .08)",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 20,
          "&:last-child": {
            paddingBottom: 20,
          },
          "@media (min-width:600px)": {
            padding: 24,
            "&:last-child": {
              paddingBottom: 24,
            },
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: 20,
          "@media (min-width:600px)": {
            padding: 24,
          },
        },
      },
    },
  },
});
