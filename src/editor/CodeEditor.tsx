import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "ts" | "css" | "txt";
}

function resolveMonacoLanguage(language: CodeEditorProps["language"]) {
  switch (language) {
    case "ts":
      return "typescript";
    case "css":
      return "css";
    case "txt":
    default:
      return "plaintext";
  }
}

export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const monacoLanguage = resolveMonacoLanguage(language);

  return (
    <Editor
      height="52svh"
      language={monacoLanguage}
      theme="vs-dark"
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        automaticLayout: true,
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        roundedSelection: true,
        lineNumbersMinChars: 3,
      }}
    />
  );
}
