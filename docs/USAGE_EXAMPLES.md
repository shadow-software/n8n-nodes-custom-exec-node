# Usage Examples

## Basic Examples

### 1. Simple Echo Command

**Input:**
```json
{
  "message": "Hello World"
}
```

**Command:**
```bash
echo "{{ $json.message }}"
```

**Output:**
```json
{
  "message": "Hello World",
  "exec": {
    "command": "echo \"Hello World\"",
    "exitCode": 0,
    "output": "Hello World\n"
  }
}
```

### 2. File Operations

**Create a file with dynamic content:**

**Input:**
```json
{
  "filename": "report",
  "content": "Sales report for Q4",
  "date": "2025-12-16"
}
```

**Command:**
```bash
echo "{{ $json.content }} - Generated on {{ $json.date }}" > /home/node/reports/{{ $json.filename }}.txt
```

### 3. Multiple Commands

**Command:**
```bash
mkdir -p /home/node/output/{{ $json.slug }} && \
cd /home/node/output/{{ $json.slug }} && \
echo "Processing {{ $json.name }}" > status.log && \
date >> status.log
```

## FFmpeg Examples

### 1. Add Text Overlay to Image

**Input:**
```json
{
  "filename": "product-001",
  "title": "Special Offer",
  "slug": "special-offer"
}
```

**Command:**
```bash
ffmpeg -i /home/node/input/{{ $json.filename }}.png \
  -vf "drawtext=text='{{ $json.title }}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  /home/node/output/{{ $json.slug }}.webp
```

### 2. Batch Convert Images

**Input:**
```json
{
  "index": 1,
  "inputPath": "/home/node/images/photo-001.jpg",
  "quality": 85
}
```

**Command:**
```bash
ffmpeg -i {{ $json.inputPath }} \
  -quality {{ $json.quality }} \
  /home/node/output/converted-{{ $json.index }}.webp
```

### 3. Create Video from Images

**Input:**
```json
{
  "projectName": "slideshow",
  "fps": 30,
  "duration": 5
}
```

**Command:**
```bash
ffmpeg -framerate {{ $json.fps }} \
  -pattern_type glob -i '/home/node/images/{{ $json.projectName }}/*.jpg' \
  -c:v libx264 -pix_fmt yuv420p \
  /home/node/output/{{ $json.projectName }}.mp4
```

### 4. Extract Audio from Video

**Input:**
```json
{
  "videoFile": "interview-01",
  "format": "mp3"
}
```

**Command:**
```bash
ffmpeg -i /home/node/videos/{{ $json.videoFile }}.mp4 \
  -vn -acodec libmp3lame -q:a 2 \
  /home/node/audio/{{ $json.videoFile }}.{{ $json.format }}
```

## Data Processing Examples

### 1. CSV to JSON Conversion

**Input:**
```json
{
  "csvFile": "sales-data",
  "outputName": "sales-2024"
}
```

**Command:**
```bash
python3 -c "import csv, json; \
  data = list(csv.DictReader(open('/home/node/data/{{ $json.csvFile }}.csv'))); \
  json.dump(data, open('/home/node/output/{{ $json.outputName }}.json', 'w'), indent=2)"
```

### 2. Image Compression

**Input:**
```json
{
  "imagePath": "/home/node/uploads/large-image.jpg",
  "quality": 75,
  "outputName": "compressed"
}
```

**Command:**
```bash
convert {{ $json.imagePath }} \
  -quality {{ $json.quality }} \
  /home/node/output/{{ $json.outputName }}.jpg
```

### 3. PDF Generation

**Input:**
```json
{
  "title": "Monthly Report",
  "content": "Report content here",
  "filename": "report-december"
}
```

**Command:**
```bash
echo "<h1>{{ $json.title }}</h1><p>{{ $json.content }}</p>" | \
  wkhtmltopdf - /home/node/pdfs/{{ $json.filename }}.pdf
```

## Advanced Examples

### 1. Conditional Processing

**Input:**
```json
{
  "fileType": "video",
  "inputFile": "media-001.mp4"
}
```

**Command:**
```bash
if [ "{{ $json.fileType }}" = "video" ]; then
  ffmpeg -i /home/node/input/{{ $json.inputFile }} -vf scale=1280:720 /home/node/output/{{ $json.inputFile }}
else
  cp /home/node/input/{{ $json.inputFile }} /home/node/output/
fi
```

### 2. Loop Processing

**Input:**
```json
{
  "pattern": "image-*.jpg",
  "prefix": "processed"
}
```

**Command:**
```bash
for file in /home/node/input/{{ $json.pattern }}; do
  filename=$(basename "$file")
  convert "$file" -resize 800x600 "/home/node/output/{{ $json.prefix }}-$filename"
done
```

### 3. Using Environment Variables

**Additional Options → Environment Variables:**
- Name: `API_KEY`
- Value: `your-secret-key`

**Command:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  -o /home/node/output/{{ $json.filename }}.json \
  https://api.example.com/data/{{ $json.id }}
```

### 4. Error Handling

**Enable "Ignore Errors" option**

**Command:**
```bash
ffmpeg -i /home/node/input/{{ $json.filename }}.mp4 \
  -vcodec libx264 /home/node/output/{{ $json.filename }}.mp4 2>&1 || \
  echo "Failed to process {{ $json.filename }}"
```

## Debugging Tips

### 1. View Full Output

**Enable:** Additional Options → Return Full Output

This gives you:
```json
{
  "exec": {
    "command": "...",
    "exitCode": 0,
    "stdout": "...",
    "stderr": "..."
  }
}
```

### 2. Test Command First

Before using in workflow, test manually:

```bash
docker exec <n8n-container> bash -c "your command here"
```

### 3. Check File Paths

**Command:**
```bash
ls -la /home/node/input/ && \
echo "---" && \
ls -la /home/node/output/
```

### 4. Verbose FFmpeg Output

**Command:**
```bash
ffmpeg -loglevel debug -i input.mp4 ... 2>&1
```

## Common Patterns

### 1. Create Directory Before Writing

```bash
mkdir -p /home/node/output/{{ $json.slug }} && \
  echo "content" > /home/node/output/{{ $json.slug }}/file.txt
```

### 2. Chain Multiple Operations

```bash
command1 && command2 || echo "Failed at command2"
```

### 3. Background Processing

```bash
nohup long-running-command > /home/node/logs/{{ $json.id }}.log 2>&1 &
```

### 4. Capture Exit Code

**Enable "Return Full Output"** to see `exitCode` in output.

## Security Best Practices

1. **Never pass unsanitized user input directly to shell commands**
2. **Use environment variables for secrets**
3. **Limit working directory permissions**
4. **Set appropriate timeout values**
5. **Enable error handling for production workflows**
6. **Log command execution for audit trails**
7. **Use read-only mounts where possible**

## Performance Tips

1. **Increase timeout for long-running operations** (default: 60000ms)
2. **Process items in batches** if dealing with large datasets
3. **Use temporary directories** for intermediate files
4. **Clean up after processing** to avoid disk space issues
5. **Monitor container resources** when processing media files
