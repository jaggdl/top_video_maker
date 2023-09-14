import 'dotenv/config'
import OpenAI from 'openai';

const openai = new OpenAI();

const CONTEXT_MESSAGE = {role: 'user', content: `

`};

async function getVideoInfo(subject, listLength) {
  const functions = [{
    name: 'make_top_list_video',
    description: `Makes top ${listLength} video about the subject in Spanish`,
    "parameters": {
      "type": "object",
      "properties": {
        "title": {
          type: "string",
          description: 'The title of the video'
        },
        // "visual_style": {
        //   type: "string",
        //   description: 'The style in that the images in the video.'  
        // },
        // "narration_mood": {
        //   type: "string",
        //   description: 'The mood that the narration of the video'  
        // },
        "description": {
          type: "string",
          description: 'The description of the video on Youtube'
        },
        "hashtags": {
          type: "array",
          description: 'the video #hashtags starting with a #',
          "items": {
            "type": "string"
          },
        },
        "items": {
          "type": "array",
          "description": `the top ${listLength} to make the video about starting from lowest ranked (#${listLength}) ending with the highest (#1)`,
          "items": {
            "type": "string"
          },
        },
      },
    },
  }];

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Tema del top: ${subject}` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
    functions,
    function_call: 'auto'
  });

  const functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments)

  if (functionArgs.items.length > listLength) {
    functionArgs.items.length = listLength;
  }

  return functionArgs;
}

async function getBody(title, subject, posisition, listLength) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Estoy haciendo un video sobre el top ${listLength} ${subject}. En el puesto ${posisition} está ${title}. Has una pequeña parte de la narración en español para el video sobre ${title}. Ten en cuenta que la lista contiene un total de ${listLength} posiciones y el video va desde la última posición hasta el primer puesto. El texto generado va a ser utilizado para generar el audio de la narración, por lo tanto es importante que no contenga anotaciones ni indicaciones.` },
      CONTEXT_MESSAGE,
    ],
    model: 'gpt-3.5-turbo-16k',
  });

  return completion.choices[0].message.content;
}

async function getImagePrompt(text, listTitle) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Your role is to write prompts for a text-to-image model. The prompt should be short; 77 tokens max, which is around 300 characters; and in English. The subject of the prompt is: "${text}"; topic is: "${listTitle}".` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
  });

  return completion.choices[0].message.content;
}

export {
  getVideoInfo,
  getBody,
  getImagePrompt, 
}