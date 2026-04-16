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


