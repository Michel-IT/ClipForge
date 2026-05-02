import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  outDir: string;
  onChange: (dir: string) => void;
}

export function OutputDirPicker({ outDir, onChange }: Props) {
  const pick = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") onChange(selected);
  };

  return (
    <div className="output-dir-picker">
      <label>Output:</label>
      <input
        type="text"
        value={outDir}
        readOnly
        placeholder="(default: ~/Downloads/ClipForge)"
      />
      <button onClick={pick}>Browse…</button>
    </div>
  );
}
