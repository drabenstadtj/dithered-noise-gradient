let ResSlider, NoiseScaleSlider; // Sliders to control resolution and noise scale
let generateButton;
let isGenerating = false; // Flag to control when to generate

let startColorPicker, endColorPicker; // Color pickers for gradient

function setup() {
  createCanvas(4480, 4480);
  pixelDensity(1); // Ensure the pixel array matches the canvas resolution
  frameRate(1); // Limit frame rate for performance, as this is a large resolution

  // Create a slider for resolution
  ResSlider = createSlider(5, 100, 15, 5); // min: 3, max: 99, default: 15, step 3 (ensuring divisibility by 3)
  ResSlider.position(10, 420); // Position slider below canvas

  // Create a slider for noise scale
  NoiseScaleSlider = createSlider(0.001, 0.1, 0.01, 0.001); // min: 0.001, max: 0.1, default: 0.01
  NoiseScaleSlider.position(150, 420); // Position slider next to the resolution slider

  // Create color pickers for the start and end colors of the gradient
  startColorPicker = createColorPicker('#ff99c7'); // Default pink color
  startColorPicker.position(10, 460); // Position the start color picker

  endColorPicker = createColorPicker('#09360b'); // Default green color
  endColorPicker.position(150, 460); // Position the end color picker

  // Create a button to control when to generate the frame
  generateButton = createButton('Generate Frame');
  generateButton.position(10, 500);
  generateButton.mousePressed(toggleGenerate);

  noLoop(); // Initially stop looping
}

function draw() {
  if (isGenerating) {
    let Res = ResSlider.value(); // Get the current resolution from the slider
    let noiseScale = NoiseScaleSlider.value(); // Get the noise scale from the slider
    doNoiseGradient(Res, noiseScale); // Call function to generate frame with noise gradient
    makeDithered(Res); // Apply dithering within subdivisions of Res
    noLoop(); // Stop after generating one frame
  }
}

function toggleGenerate() {
  isGenerating = !isGenerating; // Toggle the flag
  if (isGenerating) {
    loop(); // Start generating
  } else {
    noLoop(); // Stop generating
  }
}

function doNoiseGradient(Res, noiseScale) {
  loadPixels(); // Load pixel data to manipulate

  // Get the colors from the color pickers
  let startColor = startColorPicker.color();
  let endColor = endColorPicker.color();

  for (let x = 0; x < width; x += Res) {
    for (let y = 0; y < height; y += Res) {
      // Generate Perlin noise value for each block using the noise scale
      let noiseValue = noise(x * noiseScale, y * noiseScale); // Apply noise scale to x and y

      let r, g, b; // Color variables

      // Use the color pickers' values in the gradient
      let col = lerpColor(startColor, endColor, noiseValue); // Color gradient based on selected colors
      r = red(col);
      g = green(col);
      b = blue(col);

      // Fill the block with the calculated color
      for (let i = 0; i < Res; i++) {
        for (let j = 0; j < Res; j++) {
          let px = x + i;
          let py = y + j;

          if (px < width && py < height) { // Ensure we don't go out of bounds
            let index = (px + py * width) * 4;
            pixels[index] = r;        // Red channel
            pixels[index + 1] = g;    // Green channel
            pixels[index + 2] = b;    // Blue channel
            pixels[index + 3] = 255;  // Alpha (full opacity)
          }
        }
      }
    }
  }

  updatePixels(); // Apply the pixel changes to the canvas
}

function makeDithered(Res) {
  loadPixels(); // Reload the pixel data to apply dithering

  let subRes = Res / 5; // Subdivide each Res block into 3x3 smaller blocks
  let steps = 3; // Number of discrete color levels for dithering

  for (let x = 0; x < width; x += subRes) {
    for (let y = 0; y < height; y += subRes) {
      let idx = (x + y * width) * 4;

      // Get the average color of the block (treating each subRes as a "pixel")
      let oldR = pixels[idx];
      let oldG = pixels[idx + 1];
      let oldB = pixels[idx + 2];

      // Quantize to closest color step
      let newR = closestStep(255, steps, oldR);
      let newG = closestStep(255, steps, oldG);
      let newB = closestStep(255, steps, oldB);

      // Set the new color for the sub-block
      fillSubBlock(x, y, subRes, newR, newG, newB);

      // Calculate errors
      let errR = oldR - newR;
      let errG = oldG - newG;
      let errB = oldB - newB;

      // Distribute the error to neighboring sub-blocks
      distributeError(x, y, errR, errG, errB, subRes);
    }
  }

  updatePixels(); // Update the pixel changes on the canvas
}

// Function to fill each sub-block with the same color
function fillSubBlock(x, y, subRes, r, g, b) {
  for (let i = 0; i < subRes; i++) {
    for (let j = 0; j < subRes; j++) {
      let px = x + i;
      let py = y + j;

      if (px < width && py < height) {
        let idx = (px + py * width) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = 255; // Alpha (full opacity)
      }
    }
  }
}

// Quantize color to nearest step
function closestStep(maxValue, steps, value) {
  return Math.round(value / maxValue * steps) * (maxValue / steps);
}

// Distribute dithering error to neighboring sub-blocks
function distributeError(x, y, errR, errG, errB, subRes) {
  addError(x + subRes, y, errR, errG, errB, 7 / 16.0);
  addError(x - subRes, y + subRes, errR, errG, errB, 3 / 16.0);
  addError(x, y + subRes, errR, errG, errB, 5 / 16.0);
  addError(x + subRes, y + subRes, errR, errG, errB, 1 / 16.0);
}

// Add error to neighboring sub-blocks
function addError(x, y, errR, errG, errB, factor) {
  if (x < 0 || x >= width || y < 0 || y >= height) return; // Check bounds

  let idx = (x + y * width) * 4;

  pixels[idx] += errR * factor;
  pixels[idx + 1] += errG * factor;
  pixels[idx + 2] += errB * factor;
}
