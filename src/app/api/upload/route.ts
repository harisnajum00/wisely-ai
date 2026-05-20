import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "upload")
    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const isImage = file.type.startsWith("image/")

    return NextResponse.json({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileUrl: `/upload/${fileName}`,
      fileSize: file.size,
      isImage,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "File upload failed" },
      { status: 500 }
    )
  }
}
