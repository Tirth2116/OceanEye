from ultralytics import YOLO
import cv2
import argparse
from pathlib import Path
import sys
import shutil
import subprocess


def main():
	# Parse CLI args
	parser = argparse.ArgumentParser(description="Run YOLOv8 segmentation on a video.")
	parser.add_argument("--video", type=str, default="/Users/rudra/Documents/Hackathons/OceanHub/manythings.mp4", help="Path to input mp4")
	parser.add_argument("--output", type=str, default="output_video.mp4", help="Path to save annotated mp4")
	parser.add_argument("--model", type=str, default=None, help="Path to YOLO model .pt (defaults to backend/best.pt)")
	parser.add_argument("--no-display", action="store_true", help="Disable GUI window display")
	parser.add_argument("--prefer-h264", action="store_true", help="Prefer H.264 encoding for better browser compatibility")
	args = parser.parse_args()

	# 1) Define the path to the input video file
	video_path = args.video
	print(f"[YOLO] Starting processing for: {video_path}", flush=True)

	# 2) Load the custom-trained YOLOv8 segmentation model
	script_dir = Path(__file__).resolve().parent
	model_path = Path(args.model) if args.model else (script_dir / "best.pt")
	print(f"[YOLO] Loading model from: {model_path}", flush=True)
	model = YOLO(str(model_path))

	# 3) Open the input video for reading
	cap = cv2.VideoCapture(video_path)
	if not cap.isOpened():
		print(f"Error: Could not open video file: {video_path}")
		return

	# 4) Retrieve video properties for writer setup
	frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
	frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
	fps = cap.get(cv2.CAP_PROP_FPS)
	total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
	if fps is None or fps <= 0:
		# Fallback FPS if metadata is missing
		fps = 30.0
	print(f"[YOLO] Video properties: {frame_width}x{frame_height} @ {fps}fps, frames={total_frames}", flush=True)

	# 5) Create a VideoWriter to save the processed output
	output_path = args.output
	writer = None
	selected_codec = None
	# Try H.264 first if requested
	if args.prefer_h264:
		try:
			fourcc_h264 = cv2.VideoWriter_fourcc(*"avc1")
			writer = cv2.VideoWriter(output_path, fourcc_h264, fps, (frame_width, frame_height))
			if writer.isOpened():
				selected_codec = "avc1"
				print("[YOLO] Using codec: avc1 (H.264)", flush=True)
			else:
				writer.release()
				writer = None
		except Exception:
			writer = None
	# Fallback to mp4v (widely supported by OpenCV but not by all browsers)
	if writer is None:
		fourcc_mp4v = cv2.VideoWriter_fourcc(*"mp4v")
		writer = cv2.VideoWriter(output_path, fourcc_mp4v, fps, (frame_width, frame_height))
		if writer.isOpened():
			selected_codec = "mp4v"
			print("[YOLO] Using codec: mp4v (fallback)", flush=True)
		else:
			print(f"Error: Could not open video writer for: {output_path}")
			cap.release()
			return

	# 6) Process each frame: run tracking + segmentation, save and display
	window_title = "YOLOv8 Segmentation"
	if not args.no_display:
		cv2.namedWindow(window_title, cv2.WINDOW_NORMAL)

	frame_index = 0
	while True:
		ret, frame = cap.read()
		if not ret:
			# End of video or read error
			break

		# Run tracking with persistence for continuous IDs across frames
		results = model.track(frame, persist=True, verbose=False)

		# Get the annotated frame (masks/boxes/labels drawn)
		annotated_frame = results[0].plot() if results else frame

		# Write to output video
		writer.write(annotated_frame)
		frame_index += 1
		# Print occasional progress updates
		if frame_index % 30 == 0:
			if total_frames > 0:
				percent = (frame_index / total_frames) * 100.0
				print(f"[YOLO] Progress: {frame_index}/{total_frames} frames ({percent:.1f}%)", flush=True)
			else:
				print(f"[YOLO] Progress: {frame_index} frames processed", flush=True)

		# Display the annotated frame
		if not args.no_display:
			cv2.imshow(window_title, annotated_frame)

		# Break on 'q' key press
		if not args.no_display:
			if cv2.waitKey(1) & 0xFF == ord("q"):
				break

	# 7) Release resources and close windows
	cap.release()
	writer.release()
	if not args.no_display:
		cv2.destroyAllWindows()
	print(f"[YOLO] Done. Output saved to: {output_path}", flush=True)

	# Optional: transcode to H.264 using ffmpeg if available and we didn't already use H.264
	if selected_codec != "avc1":
		ffmpeg = shutil.which("ffmpeg")
		if ffmpeg:
			print("[YOLO] Transcoding to H.264 for browser playback...", flush=True)
			tmp_out = str(Path(output_path).with_suffix(".h264.mp4"))
			try:
				# Faststart helps streaming; -y to overwrite
				cmd = [
					ffmpeg,
					"-y",
					"-i", output_path,
					"-c:v", "libx264",
					"-preset", "veryfast",
					"-movflags", "+faststart",
					tmp_out,
				]
				subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
				# Replace original
				Path(output_path).unlink(missing_ok=True)
				Path(tmp_out).rename(output_path)
				print("[YOLO] Transcode complete.", flush=True)
			except Exception as e:
				print(f"[YOLO] Transcode skipped/failed: {e}", flush=True)


if __name__ == "__main__":
	main()

