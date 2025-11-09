import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { spawn } from "child_process"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getScriptPath(): string {
  // Prefer the absolute path provided by the user
  const absolute = "/Users/rudra/Documents/Hackathons/OceanHub/backend/yolov8_seg_track.py"
  // Fallback to resolving from the frontend directory if absolute path changes
  const fallback = path.resolve(process.cwd(), "..", "backend", "yolov8_seg_track.py")
  return absolute || fallback
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' (mp4) in form-data" }, { status: 400 })
    }

    if (!file.type.includes("mp4")) {
      // Allow even if type is empty on some browsers; else enforce mp4
      // return NextResponse.json({ error: "Only MP4 videos are supported" }, { status: 400 })
    }

    // Save upload to backend/uploads with timestamped filename
    const bytes = new Uint8Array(await file.arrayBuffer())
    const uploadsDir = path.resolve(process.cwd(), "..", "backend", "uploads")
    await fs.mkdir(uploadsDir, { recursive: true })
    const timestamp = Date.now()
    const inputFilename = `upload_${timestamp}.mp4`
    const inputPath = path.join(uploadsDir, inputFilename)
    await fs.writeFile(inputPath, bytes)

    // Prepare output path (in repo root or backend)
    const outputsDir = path.resolve(process.cwd(), "..")
    const outputFilename = `output_video_${timestamp}.mp4`
    const outputPath = path.join(outputsDir, outputFilename)

    // Spawn python script in background
    const python = process.env.PYTHON_BIN || "python3"
    const scriptPath = getScriptPath()
    const args = [scriptPath, "--video", inputPath, "--output", outputPath, "--no-display"]

    const child = spawn(python, args, {
      stdio: "ignore",
      detached: true,
      env: {
        ...process.env,
      },
    })
    child.unref()

    return NextResponse.json({
      started: true,
      input: inputPath,
      output: outputPath,
      pid: child.pid,
      note: "Processing started. This may take a while; the output file will be written when done.",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to start processing" }, { status: 500 })
  }
}



