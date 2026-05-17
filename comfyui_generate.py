import json
import urllib.request
import uuid
import os
import shutil
import time

SERVER_ADDRESS = "127.0.0.1:8188"
OUTPUT_DIR = r"D:\Claude Code Porjects\reformed_theology_content_creator\firmlywithchrist_site\assets\generated"
COMFY_OUTPUT = r"D:\ComfyUI\output"

def queue_prompt(prompt):
    p = {"prompt": prompt, "client_id": str(uuid.uuid4())}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"http://{SERVER_ADDRESS}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def get_history(prompt_id):
    try:
        with urllib.request.urlopen(f"http://{SERVER_ADDRESS}/history/{prompt_id}") as response:
            return json.loads(response.read())
    except:
        return {}

def wait_for_prompt(prompt_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        hist = get_history(prompt_id)
        if prompt_id in hist:
            outputs = hist[prompt_id].get('outputs', {})
            if outputs:
                return outputs
        time.sleep(2)
    return None

def copy_latest_output(prefix, dst_dir):
    files = [f for f in os.listdir(COMFY_OUTPUT) if f.startswith(prefix)]
    if not files:
        return None
    latest = max(files, key=lambda f: os.path.getmtime(os.path.join(COMFY_OUTPUT, f)))
    src = os.path.join(COMFY_OUTPUT, latest)
    dst = os.path.join(dst_dir, latest)
    shutil.copy2(src, dst)
    return dst

def make_workflow_paper():
    return {
        "1": {"inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": "seamless aged archival paper texture, warm ivory cream parchment, subtle foxing spots, delicate grain, high resolution scan, flat even lighting, no text, no borders, tileable pattern, muted tones, organic imperfections, watercolor paper tooth, soft watercolor wash background", "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": "text, border, frame, modern, clean, bright, synthetic, plastic, glossy, sharp edges, digital, watermark, signature", "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": 1024, "height": 1024, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"seed": 42, "steps": 30, "cfg": 7, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]}, "class_type": "KSampler"},
        "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "7": {"inputs": {"images": ["6", 0], "filename_prefix": "paper_tile"}, "class_type": "SaveImage"}
    }

def make_workflow_splash(color_name, color_desc, seed):
    prompt = f"single isolated watercolor ink blot splash, {color_desc}, organic irregular edges, soft diffused pigment, one isolated shape, asymmetric, paper texture visible, muted tones, delicate tendrils, no perfect circle, no text, centered composition, white background"
    negative = "text, border, frame, multiple shapes, perfect circle, geometric, sharp edges, hard outline, synthetic, digital, gradient background, dark background"
    return {
        "1": {"inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": negative, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": 1024, "height": 1024, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"seed": seed, "steps": 30, "cfg": 7, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]}, "class_type": "KSampler"},
        "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "7": {"inputs": {"images": ["6", 0], "filename_prefix": f"splash_{color_name}"}, "class_type": "SaveImage"}
    }

def make_workflow_stroke():
    prompt = "single isolated watercolor brush stroke, warm ochre gold, horizontal streak, organic irregular edges, soft diffused pigment, one isolated shape, paper texture visible, muted tones, no text, centered composition, white background"
    negative = "text, border, frame, multiple shapes, geometric, sharp edges, hard outline, synthetic, digital, gradient background, dark background"
    return {
        "1": {"inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": negative, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": 1024, "height": 256, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"seed": 99, "steps": 30, "cfg": 7, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]}, "class_type": "KSampler"},
        "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "7": {"inputs": {"images": ["6", 0], "filename_prefix": "stroke_horizontal"}, "class_type": "SaveImage"}
    }

def make_workflow_cursor():
    prompt = "tiny watercolor dot, warm ochre gold, small soft circle, organic edges, paper texture visible, muted tones, no text, centered composition, white background"
    negative = "text, border, frame, multiple shapes, geometric, sharp edges, hard outline, synthetic, digital, large, dark background"
    return {
        "1": {"inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": negative, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": 256, "height": 256, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"seed": 77, "steps": 25, "cfg": 7, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]}, "class_type": "KSampler"},
        "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "7": {"inputs": {"images": ["6", 0], "filename_prefix": "cursor_dot"}, "class_type": "SaveImage"}
    }

if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    jobs = [
        ("paper_tile", make_workflow_paper()),
        ("splash_rose", make_workflow_splash("rose", "dusty rose pink", 101)),
        ("splash_ochre", make_workflow_splash("ochre", "warm ochre gold amber", 102)),
        ("splash_sepia", make_workflow_splash("sepia", "brown sepia ink wash", 103)),
        ("splash_indigo", make_workflow_splash("indigo", "muted indigo gray blue", 104)),
        ("stroke_horizontal", make_workflow_stroke()),
        ("cursor_dot", make_workflow_cursor()),
    ]

    prompt_ids = {}
    for name, wf in jobs:
        print(f"Queueing {name}...")
        try:
            resp = queue_prompt(wf)
            pid = resp['prompt_id']
            prompt_ids[name] = pid
            print(f"  Prompt ID: {pid}")
        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\nWaiting for {len(prompt_ids)} jobs to complete...")
    for name, pid in prompt_ids.items():
        print(f"  Waiting for {name} ({pid})...")
        outputs = wait_for_prompt(pid)
        if outputs:
            copied = copy_latest_output(name, OUTPUT_DIR)
            if copied:
                print(f"    Saved to: {copied}")
            else:
                print(f"    No output file found for {name}")
        else:
            print(f"    Timeout waiting for {name}")

    print("\nDone.")
