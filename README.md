# Text to Tree Encoder

A simple interactive web app that encodes text into a growing tree structure. Each letter is translated into Morse code, and the tree grows according to the sequence of dots (`.`), dashes (`-`), and bars (`|`). The tree grows dynamically as you type, and the growth can be customized via adjustable parameters.

---

## Motivation

The idea of this project is to create an encoding of natural language in form of a visual art . Output of this app can be used as is or as a template for painting or drawing. 
For example, the provided `drawing.png` encodes the sentence:  
*"If pictures were music, this one would have lyrics."* 

---

## Features

- **Dynamic Tree Growth:** Type letters or digits and watch the tree grow in real time.
- **Undo:** Remove the last entered character(s) using backspace.
- **Morse Encoding:** Each character is translated into Morse code (`.` = left+straight, `-` = right+straight, `|` = all three branches).
- **Adjustable Parameters:**
  - Branching angle
  - Length decay
  - Width decay
  - Minimum branch length and width
- **Interactive Sliders and Number Inputs:** Adjust parameters precisely while observing the tree.
- **Adaptive Canvas:** Tree is automatically scaled to fit the viewport.
- **Export Options:** Save the current tree as PNG or SVG.
<!-- - **Mobile-Friendly:** Input works on touchscreen keyboards. -->

---

## How to Use

1. Open `index.html` in a web browser or use github pages (pranislav.github.io/morse_tree)
2. Start typing letters or digits. The tree grows in real time.
3. Use **Backspace** to undo the last character(s).
4. Adjust tree appearance using sliders or numeric inputs.
5. Save the tree using the **PNG** or **SVG** buttons.

---

## Parameters

| Parameter         | Description                                  | Default |
|------------------|----------------------------------------------|---------|
| Branch Angle      | Angle between branches                        | 40°     |
| Length Decay      | Factor by which branch length decreases      | 0.72    |
| Width Decay       | Factor by which branch width decreases       | 0.8     |
| Minimum Length    | Smallest allowable branch length             | 10      |
| Minimum Width     | Smallest allowable branch width              | 0.6     |

---

## Input Limitations

- Case-insensitive: There is no difference between uppercase and lowercase letters.
- Only standard English letters and digits are supported.
- Diacritics (accents, umlauts, etc.) are ignored.


---

## License

MIT License. Free to use and modify.
