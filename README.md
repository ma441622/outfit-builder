# Outfit Builder
Outfit Builder is a virtual wardrobe and styling web application that helps users plan and visualize outfit combinations before getting dressed.
Users can upload photos of their own clothing items to create a digital wardrobe. They can then drag and drop these items onto a mannequin canvas to mix and match different pieces, seeing how tops, bottoms, shoes, and accessories look together as a complete outfit.

## Features
**1. Drag-and-Drop Canvas** - A central workspace where users can drag clothing items onto a mannequin. Items can be positioned, resized, and rotated freely to create outfit combinations.

**2. Clothing Wardrobe** - A categorized panel containing the user's clothing items, organized into tabs: Tops, Bottoms, Shoes, and Accessories. Users can browse their wardrobe and drag items to the canvas.

**3. Image Upload** - Allows users to upload their own clothing images to add to their wardrobe. Uploaded items are saved to the selected category.

**4. Color Tagging System** - Users can assign a color tag to each clothing item by clicking an edit button. Available colors include red, pink, blue, green, yellow, purple, black, white, silver, and gold.

**5. Color Filtering** - A filter bar that shows only clothing items tagged with a specific color. Helps users quickly find items that match a desired color scheme.

**6. Save Outfits** - Users can save their current canvas arrangement as a named outfit. Saved outfits include all item positions, sizes, and rotations.

**7. My Outfits Panel** - A panel displaying all previously saved outfits with thumbnail previews. Users can load a saved outfit back onto the canvas or delete it.

**8. Canvas Control**
  - Clear Canvas: Removes all items from the workspace
  - Item Selection: Click to select items for editing
  - Delete Items: Remove individual items via button or Delete key
  - Resize/Rotate: Handles for transforming selected items

**9. AI Style Assistant** - An integrated AI chatbot that generates outfit suggestions based on style prompts (e.g., "streetwear winter", "soft girl aesthetic").
Responses are cached for quick access to previous suggestions.

**10. Persistent Storage** - All data (wardrobe items, canvas state, saved outfits, AI cache) is stored locally using IndexedDB and localStorage, so users don't lose their work between sessions.

## Technologies Used

**Frontend**                                                          
*HTML5*
  The application structure is built with semantic HTML, including modals, panels, and interactive elements.

*CSS3*
  Custom styling using modern CSS features including:
  - Flexbox and Grid for layouts
  - CSS gradients and animations
  - Transitions for interactive feedback
  - Responsive design principles

*Vanilla JavaScript*
  All interactivity is handled with plain JavaScript (no frameworks), including:
  - DOM manipulation
  - Event handling for drag-and-drop
  - Canvas item transformations (resize, rotate, position)
  - Modal and panel management

*Google Fonts*
  The Inter font family is loaded externally for typography.

*Data Storage*
 IndexedDB
  A browser-based NoSQL database used to persist:    
  - Uploaded clothing items (stored as base64 image data)
  - Canvas state (item positions, sizes, rotations)
  - Saved outfits

*LocalStorage*                                                        
Used to cache AI style assistant responses for quick retrieval.

# Outfit Builder AI Feature

I added an AI styling assistant to my Outfit builder application. Users can enter a prompt involving style choices (i.e what to wear to a picnic) and generate a text based outfit suggestion via AI.

It sends the input to the local LLM and displays the generated outfit idea in as a text display in the application. It also uses caching with localStorage to save prompts and outputs, for future reference.

## API/Service Used

This project utilizes Ollama, a local LLM API.

Which can be downloaded [Here.](https://ollama.com/download)

### How to run Ollama


**1. Install Ollama from the link above.**

Follow the directions listed on the website.

**2. Pull a model**

Execute the following command in your system’s terminal:
```
ollama pull llama3
```

**3. Start Ollama**

Ollama runs locally at:
```
http://localhost:11434
```

**4. Open the Outfit Builder App**

+ Recommend VSCode live server, regardless, get the HTML code to open in a browser.

**5. How to use the feature**

1. Enter a styling prompt
2. Click "Generate Outfit"
3. View the generated result.
4. Get to styling!

## Features

