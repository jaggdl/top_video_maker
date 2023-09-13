import sys
from diffusers import DiffusionPipeline

def generate_image(prompt, output_path):
    pipe = DiffusionPipeline.from_pretrained("stabilityai/stable-diffusion-xl-base-1.0", use_safetensors=True)
    pipe.to("mps")
    pipe.enable_attention_slicing()
    image = pipe(prompt=prompt).images[0]
    image.save(output_path)

if __name__ == "__main__":
    prompt = sys.argv[1]
    output_path = sys.argv[2]
    generate_image(prompt, output_path)
