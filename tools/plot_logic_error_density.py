"""Render interpolation peak-error densities from the original experimental values.

Run from any directory with NumPy, SciPy, Matplotlib and Pillow installed.
"""
from pathlib import Path
import io
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
import numpy as np
from PIL import Image
from scipy.stats import gaussian_kde

ASSETS = Path(__file__).resolve().parents[1] / "assets/ai/logic-vae"
data = json.loads((ASSETS / "peak-errors.json").read_text())
series = [
    ("zero", "Without compression", "#a4673b"),
    ("full", "With compression", "#285a61"),
]
estimates = []
upper = 0.0
for key, label, colour in series:
    values = np.asarray(data[key], dtype=float)
    kde = gaussian_kde(values, bw_method="scott")
    bandwidth = float(np.sqrt(kde.covariance[0, 0]))
    upper = max(upper, float(values.max()) + 4 * bandwidth)
    estimates.append((kde, label, colour))
x = np.linspace(0, np.ceil(upper * 20) / 20, 1600)

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 12,
    "text.color": "#243035", "axes.labelcolor": "#243035",
    "xtick.color": "#243035", "ytick.color": "#243035",
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": "#485358", "axes.linewidth": 0.8,
})
fig, ax = plt.subplots(figsize=(10, 4.8), layout="constrained")
for kde, label, colour in estimates:
    # Reflect at zero so smoothing respects nonnegative probability errors.
    density = kde(x) + kde(-x)
    ax.fill_between(x, density, color=colour, alpha=0.24, linewidth=0)
    ax.plot(x, density, color=colour, linewidth=2.25)
ax.set(xlim=(0, x[-1]), ylim=(0, None),
       xlabel="Peak normalized probability error along a path", ylabel="Density")
ax.grid(axis="y", alpha=0.15, linewidth=0.7)
ax.set_axisbelow(True)
ax.legend(handles=[Patch(facecolor=(*matplotlib.colors.to_rgb(c), 0.24),
                             edgecolor=c, linewidth=1.8, label=label)
                   for _, label, c in series],
          loc="upper right", frameon=False)
png = io.BytesIO()
fig.savefig(png, format="png", dpi=180, facecolor="white")
plt.close(fig)
png.seek(0)
Image.open(png).convert("RGB").save(ASSETS / "error-distribution.webp",
                                     quality=95, method=6)
