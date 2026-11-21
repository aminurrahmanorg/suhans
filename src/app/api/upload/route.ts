import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const rawExt = path.extname(file.name);
    const ext = rawExt.toLowerCase() || ".jpg";
    const cleanBase = path
      .basename(file.name, rawExt)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const targetDir = path.join(process.cwd(), "public", "images");
    await mkdir(targetDir, { recursive: true });

    let finalFileName = `${cleanBase}_${Date.now()}${ext}`;
    const rawFilePath = path.join(targetDir, finalFileName);
    await writeFile(rawFilePath, buffer);

    // If file is an Apple HEIC image, automatically convert to standard JPG
    if (ext === ".heic") {
      const jpgFileName = `${cleanBase}_${Date.now()}.jpg`;
      const jpgFilePath = path.join(targetDir, jpgFileName);
      const scriptPath = path.join(process.cwd(), "scripts", "convert-heic.ps1");

      try {
        await execFileAsync("powershell", [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          "-inPath",
          rawFilePath,
          "-outPath",
          jpgFilePath,
        ]);

        // Clean up the raw .heic file to save disk space
        await unlink(rawFilePath).catch(() => {});
        finalFileName = jpgFileName;
      } catch (convErr) {
        console.warn("HEIC auto-conversion notice:", convErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: `/images/${finalFileName}`,
      fileName: finalFileName,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
