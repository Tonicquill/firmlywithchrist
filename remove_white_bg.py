from PIL import Image
import numpy as np
import os, glob

GEN_DIR = "assets/generated"

def remove_white_bg(path, out_path, threshold=240):
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    # Mask: all channels above threshold = near-white paper
    white = (arr[:,:,0] > threshold) & (arr[:,:,1] > threshold) & (arr[:,:,2] > threshold)
    arr[white] = [255, 255, 255, 0]
    Image.fromarray(arr).save(out_path)

for png in glob.glob(os.path.join(GEN_DIR, "*.png")):
    remove_white_bg(png, png)
    print("Processed:", os.path.basename(png))
