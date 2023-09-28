import 'dotenv/config'
import OpenAI from 'openai';

const openai = new OpenAI();

const schema = {
  "type": "object",
  properties: {
    title: {
      type: "string",
      description: 'The title of the video'
    },
    items: {
      type: "array",
      description: `The items in the list`,
      items: {
        type: "object",
        properties: {
         title: {
          type: "string",
          description: `The title of the list item`,
         },
         longDescription: {
          type: "string",
          description: `A long description of the item`,
          prompt: 'Make a long description about $(title)'
         }
        }
      },
    },
  },
  "required": [
    'title',
    'items',
  ]
}


function checkPromptInProperties(properties) {
  for (const [key, value] of Object.entries(properties)) {
    if (value.hasOwnProperty('prompt')) {
      // Do something when the 'prompt' property is found
      console.log(`Property ${key} has a prompt: ${value.prompt}`);
      delete properties[key];
    }
    // If the property is an object or array, recurse into it
    if (value.type === 'object') {
      checkPromptInProperties(value.properties);
    } else if (value.type === 'array' && value.items && value.items.properties) {
      checkPromptInProperties(value.items.properties);
    }
  }
}


checkPromptInProperties(schema.properties);

console.log(schema.properties.items.items);


// const functions = [{
//   name: 'make_list',
//   description: `Makes a list about something`,
//   "parameters": schema
// }];

// const completion = await openai.chat.completions.create({
//   messages: [
//     { role: 'user', content: `Palabras en español que empiezen con "A"` },
//   ],
//   model: 'gpt-3.5-turbo-0613',
//   functions,
//   function_call: {"name": "make_list"}
// });

// const functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments)
// console.log(functionArgs)