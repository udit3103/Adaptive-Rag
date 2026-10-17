"""
Streamlit chat and document-upload interface.
"""

import uuid

import requests
import streamlit as st

from streamlit_app.utils.api_client import document_upload_rag, query_backend

st.set_page_config(page_title="Adaptive RAG", page_icon="📚")
st.title("Adaptive RAG")
st.caption("Ask questions about your documents, general topics, or current events.")

if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

with st.sidebar:
    st.header("Documents")
    with st.form("document_upload", clear_on_submit=True):
        uploaded_file = st.file_uploader(
            "Upload a PDF or TXT file",
            type=["pdf", "txt"],
        )
        description = st.text_input(
            "Describe the document",
            max_chars=300,
            placeholder="A short summary of its subject",
        )
        upload_submitted = st.form_submit_button("Upload and index")

    if upload_submitted:
        if uploaded_file is None:
            st.warning("Choose a PDF or TXT file first.")
        elif not description.strip():
            st.warning("Add a short description before uploading.")
        else:
            try:
                document_upload_rag(uploaded_file, description.strip())
                st.success(f"Indexed {uploaded_file.name}.")
            except (requests.RequestException, RuntimeError, ValueError, KeyError) as exc:
                st.error(f"Document upload failed: {exc}")

    if st.button("Start a new chat"):
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.chat_history = []
        st.rerun()

for role, message in st.session_state.chat_history:
    with st.chat_message(role):
        st.markdown(message)

if prompt := st.chat_input("Ask a question"):
    st.session_state.chat_history.append(("user", prompt))
    try:
        answer = query_backend(prompt, st.session_state.session_id)
    except (requests.RequestException, ValueError, KeyError) as exc:
        st.error(f"Could not get a response from the API: {exc}")
    else:
        st.session_state.chat_history.append(("assistant", answer))
        st.rerun()
