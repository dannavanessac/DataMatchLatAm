"""DataMatch LatAm · despliegue en Streamlit Community Cloud.

La app está hecha en HTML y JavaScript. Este archivo la empaqueta en una sola página,
le pasa las claves de Supabase desde los Secrets de Streamlit y la muestra a pantalla completa.

    App:                    https://<tu-app>.streamlit.app
    Panel de administración: https://<tu-app>.streamlit.app/?vista=admin
    Enlace de invitación:   https://<tu-app>.streamlit.app/?ref=<id>
"""
import json
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

BASE = Path(__file__).parent

st.set_page_config(
    page_title="DataMatch LatAm · Emprende con quien encaja",
    page_icon=str(BASE / "favicon.png"),
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Ocultar el marco de Streamlit para que la app ocupe toda la pantalla
st.markdown(
    """
    <style>
      #MainMenu, header[data-testid="stHeader"], footer, [data-testid="stToolbar"],
      [data-testid="stDecoration"], [data-testid="stStatusWidget"] { display: none !important; }
      .block-container, [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: 100% !important; }
      [data-testid="stAppViewContainer"] > .main, [data-testid="stMain"] { padding: 0 !important; }
      iframe { display: block; width: 100% !important; height: 100vh !important; border: 0; }
      html, body, [data-testid="stApp"] { overflow: hidden; }
    </style>
    """,
    unsafe_allow_html=True,
)


def secret(name, default=None):
    try:
        return st.secrets[name]
    except Exception:
        return default


@st.cache_data(show_spinner=False)
def read(name: str) -> str:
    return (BASE / name).read_text(encoding="utf-8")


def build_page(mode: str, ref: str | None) -> str:
    config = {
        "SUPABASE_URL": secret("SUPABASE_URL", ""),
        "SUPABASE_ANON_KEY": secret("SUPABASE_ANON_KEY", ""),
        "ADMINS": list(secret("ADMINS", [])),
        "APP_URL": secret("APP_URL", ""),
        "REF_QUERY": True,
    }
    boot = (
        f"window.DATAMATCH_CONFIG = {json.dumps(config)};\n"
        f"window.DATAMATCH_MODE = {json.dumps(mode)};\n"
        f"window.DATAMATCH_REF = {json.dumps(ref)};\n"
    )
    html = read("index.html")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{read('styles.css')}\n</style>")
    html = html.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">', "")
    html = html.replace('<script src="config.js"></script>', f"<script>\n{boot}</script>")
    for js in ("supabase-adapter.js", "core.js", "app.js", "admin.js"):
        code = read(js).replace("</script", "<\\/script")
        html = html.replace(f'<script src="{js}"></script>', f"<script>\n{code}\n</script>")
    return html


params = st.query_params
mode = "admin" if params.get("vista") == "admin" else "app"
ref = params.get("ref")
if ref and not re.fullmatch(r"[\w-]{3,40}", ref):
    ref = None

if not secret("SUPABASE_URL"):
    st.toast("Faltan las claves de Supabase en Settings → Secrets. La app abre en modo demostración.")

page = build_page(mode, ref)
if hasattr(st, "iframe"):          # Streamlit 1.5x en adelante
    st.iframe(page, height=900)
else:                              # versiones anteriores
    components.html(page, height=900, scrolling=True)
