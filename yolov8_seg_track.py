from ultralytics import YOLO
import cv2


def main():
	# 1) Define the path to the input video file
	video_path = "/Users/rudra/Documents/Hackathons/OceanHub/manythings.mp4"  # Change this to your input video path if needed

	# 2) Load the custom-trained YOLOv8 segmentation model
	model = YOLO("best.pt")

	# 3) Open the input video for reading
	cap = cv2.VideoCapture(video_path)
	if not cap.isOpened():
		print(f"Error: Could not open video file: {video_path}")
		return

	# 4) Retrieve video properties for writer setup
	frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
	frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
	fps = cap.get(cv2.CAP_PROP_FPS)
	if fps is None or fps <= 0:
		# Fallback FPS if metadata is missing
		fps = 30.0

	# 5) Create a VideoWriter to save the processed output
	output_path = "output_video.mp4"
	fourcc = cv2.VideoWriter_fourcc(*"mp4v")
	writer = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
	if not writer.isOpened():
		print(f"Error: Could not open video writer for: {output_path}")
		cap.release()
		return

	# 6) Process each frame: run tracking + segmentation, save and display
	window_title = "YOLOv8 Segmentation"
	cv2.namedWindow(window_title, cv2.WINDOW_NORMAL)

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

		# Display the annotated frame
		cv2.imshow(window_title, annotated_frame)

		# Break on 'q' key press
		if cv2.waitKey(1) & 0xFF == ord("q"):
			break

	# 7) Release resources and close windows
	cap.release()
	writer.release()
	cv2.destroyAllWindows()


if __name__ == "__main__":
	main()

