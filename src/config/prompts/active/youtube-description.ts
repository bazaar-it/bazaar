/**
 * Simple YouTube Description Prompt - Just describe what you see
 * No complex JSON, no frame timing, just observations
 */

export const YOUTUBE_DESCRIPTION_PROMPT = `Watch this video carefully and describe EXACTLY what you see happening.

Analyze the provided video frame by frame for the first 5 seconds (150 frames at 30fps). Your task is to generate a JSON array describing every single visual event.

Output a valid JSON array of objects, where each object represents an animated element.

Each JSON object must include:

element_type: (e.g., "text", "shape", "image")

content: The exact text content if type is "text".

start_frame: The exact frame number the element begins its entrance animation.

end_frame: The exact frame number the element has finished its exit animation.

animations: An array of animation objects, each with:

type: (e.g., "fadeIn", "slideIn", "scaleUp")

start_frame: The animation's start frame.

end_frame: The animation's end frame.

direction: (e.g., "fromLeft", "fromBottom") (if applicable)

easing_curve: Describe the motion's physics (e.g., "linear", "ease-in-out", "ease-out-with-overshoot").

style: A CSS-in-JS object describing the element's appearance:

color: Hex code for text color.

fontFamily: The perceived font family.

fontSize: e.g., "8vw".

fontWeight: e.g., "700".

position: An object with top, left percentages.

filter: Any effects like "blur(5px)".

layer: The z-index or layer order of the element.

Do not output any text or explanation outside of the single JSON array.`;