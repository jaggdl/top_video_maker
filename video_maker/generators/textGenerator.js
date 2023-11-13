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
          description: 'An eye-catching title for the video'
        },
        "visualStyle": {
          type: "string",
          description: 'Suggest the visual style in English for the images in the video'  
        },
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
          "description": `the top ${listLength} to make the video about starting from lowest ranked (#${listLength}) ending with the highest (#1). The item should not contain its position`,
          "items": {
            "type": "string"
          },
        },
      },
      "required": [
        'title',
        'description',
        'items',
        'hashtags',
        'visual_style',
      ]
    },
  }];

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Tema del top: ${subject}` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
    functions,
    function_call: {"name": "make_top_list_video"}
  });

  const functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments)

  if (functionArgs.items.length > listLength) {
    functionArgs.items.length = listLength;
  }

  return functionArgs;
}

async function getVideoIntro({listLength, subject}) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Estoy haciendo un video sobre el top ${listLength} ${subject}. Has una pequeña introducción par el video. Menciona brevemente que te suscribas al canal, dar like, compartir y sugerir nuevos temas para futuros videos en los comentarios` },
      CONTEXT_MESSAGE,
    ],
    model: 'gpt-3.5-turbo-16k',
  });

  return completion.choices[0].message.content;
}

async function getVideoOutro({listLength, subject}) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Estoy haciendo un video sobre el top ${listLength} ${subject}. Has una pequeña outro par el video.` },
      CONTEXT_MESSAGE,
    ],
    model: 'gpt-3.5-turbo-16k',
  });

  return completion.choices[0].message.content;
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

async function getImagePrompt(text, listTitle, style) {
  const numberOfPrompts = 1;
  const functions = [{
    name: 'make_images',
    description: `Your role is to write a ${numberOfPrompts} prompts for a text-to-image model. Each prompt should be short; 77 tokens max, which is around 300 characters; and in English. The subject of the prompt is: "${text}"; topic is: "${listTitle}". The style of the image should be ${style}. Don't include the word "infographic"`,
    "parameters": {
      "type": "object",
      "properties": {
        "prompts": {
          "type": "array",
          "description": `The prompt`,
          "items": {
            "type": "string"
          },
        },
      },
    },
  }];

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'user', content: `Your role is to write a single prompt for a text-to-image model. The prompt should be short; 77 tokens max, which is around 300 characters; and in English. The subject of the prompt is: "${text}"; topic is: "${listTitle}". The style of the image should be ${style}.` },
      CONTEXT_MESSAGE
    ],
    model: 'gpt-4-0613',
    functions,
    function_call: {"name": "make_images"}
  });

  const functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments)

  if (functionArgs.prompts.length > numberOfPrompts) {
    functionArgs.prompts.length = numberOfPrompts;
  }

  return functionArgs.prompts;
}

export {
  getVideoInfo,
  getBody,
  getImagePrompt,
  getVideoIntro,
  getVideoOutro,
}