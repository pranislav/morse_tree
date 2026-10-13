# Text to Tree Encoder

A simple interactive web app that encodes text into a growing tree. Each letter is translated into Morse code, and the tree grows from dots (`.`), dashes (`-`), and bars (`|`). Adjust the tree as it grows, then save it as an image.

---

## Motivation

The idea of this project is to create an encoding of natural language in form of a visual art . Output of this app can be used as is or as a template for painting or drawing. 
For example, the provided `drawing.png` encodes the sentence:  
*"If pictures were music, this one would have lyrics."* 

---

## Features

- **Dynamic Tree Growth:** Type letters or digits and watch the tree grow in real time.
- **Text editing:** Edit or delete characters anywhere in the text field. Backspace also undoes the last character when the canvas has focus.
- **Morse Encoding:** Each character is translated into Morse code (`.` = left+straight, `-` = right+straight, `|` = all three branches).
- **Adjustable Parameters:**
  - Branching angle
  - Length decay
  - Width decay
  - Minimum branch length and width
- **Adjustable controls:** Use sliders or number fields. Decimal fields accept either a dot or comma, and out-of-range values are clamped to the allowed limits.
- **Responsive layout:** On phones, the tree and text field appear above the save and parameter controls. The canvas keeps its proportions and fits the screen width.
- **Adaptive view:** The tree scales to fit while keeping its trunk centered and near the bottom of the canvas.
- **Export Options:** Save the current tree as PNG or SVG.

---

## How to Use

1. Open `index.html` in a web browser or visit [the hosted app](https://pranislav.github.io/morse_tree).
2. Type letters, digits, and spaces in the text field. Spaces add a bar (`|`) to the tree.
3. Edit the text directly; deleting a character rebuilds the tree from the remaining text.
4. Adjust the tree using the sliders or number fields.
5. Select **Save PNG** or **Save SVG** to export the tree.

---

## Parameters

| Parameter         | Range | Description | Default |
|------------------|-------|-------------|---------|
| Branch angle | 0–180° | Angle between branches | 40° |
| Length decay | 0–2 | Multiplier applied to each new branch length | 0.7 |
| Width decay | 0–2 | Multiplier applied to each new branch width | 0.8 |
| Minimum length | 0–1 | Minimum branch length as a fraction of the trunk length | 0.1 |
| Minimum width | 0–1 | Minimum branch width as a fraction of the trunk width | 0.1 |

---

## Input Limitations

- Case-insensitive: There is no difference between uppercase and lowercase letters.
- Standard English letters and digits are supported.
- Diacritics (accents, umlauts, etc.) are ignored.


---

## License

MIT License. Free to use and modify.
