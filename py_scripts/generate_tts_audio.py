import os
import json
from fairseq.checkpoint_utils import load_model_ensemble_and_task_from_hf_hub
from fairseq.models.text_to_speech.hub_interface import TTSHubInterface
from scipy.io.wavfile import write
import numpy as np
import nltk
import sys
import re

def normalize_audio(audio):
    audio = audio / np.max(np.abs(audio))
    return np.int16(audio * 32767)

def generate_audio(text, output_directory):
    nltk.download('punkt')

    models, cfg, task = load_model_ensemble_and_task_from_hf_hub(
        "facebook/tts_transformer-es-css10",
        arg_overrides={"vocoder": "hifigan", "fp16": False}
    )
    model = models[0]
    TTSHubInterface.update_cfg_with_data_cfg(cfg, task.data_cfg)
    generator = task.build_generator([model], cfg)

    if not os.path.exists(output_directory):
        os.makedirs(output_directory)

    audio_files_list = []
    sentences = nltk.sent_tokenize(text, language='spanish')
    for i, sentence in enumerate(sentences):
        sample = TTSHubInterface.get_model_input(task, sentence)
        wav, rate = TTSHubInterface.get_prediction(task, model, generator, sample)
        wav_numpy = wav.cpu().numpy()
        
        if len(wav_numpy.shape) == 2:
            wav_numpy = wav_numpy.squeeze()

        normalized_wav = normalize_audio(wav_numpy)
        filename = "".join(x for x in sentence if x.isalnum() or x.isspace())
        filename = sanitize_filename(filename.replace(" ", "_")[:50])
        full_filename = os.path.join(output_directory, f"{filename}.wav")
        
        audio_files_list.append(full_filename)
        write(full_filename, rate, normalized_wav)
    
    return json.dumps({"audio_files": audio_files_list})

def sanitize_filename(filename):
    return re.sub(r'[^a-zA-Z0-9_]', '_', filename)



if __name__ == '__main__':
    text = sys.argv[1]
    output_directory = sys.argv[2]
    print(generate_audio(text, output_directory))