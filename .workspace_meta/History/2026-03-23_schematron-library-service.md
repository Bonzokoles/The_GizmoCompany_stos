# Schematron-3B for library-management

**Data startu:** 2026-03-23
**Data zakończenia:** 2026-03-23
**Status:** completed

## Cel
Sprawdzić, czy `U:\The_DEVz_HUB_of_work\Schematron-3B` faktycznie nadaje się do obsługi bibliotek i jeśli tak, przygotować bezpieczną ścieżkę uruchamiania lokalnego.

## Wnioski
- `Schematron-3B` jest prawdziwie mocny, ale w **konkretnym zadaniu**: HTML -> JSON extraction.
- To nie jest uniwersalny model do ogólnego zarządzania biblioteką wiedzy.
- Najlepsza rola w tym workspace: extractor / ingestion worker dla `library-management`.
- Nie dodano go do Ollama, bo:
  1. w repo istnieje wcześniejsza decyzja o niewracaniu do Ollama,
  2. lokalny model jest w formacie HF `safetensors`, nie gotowym modelu Ollama,
  3. sensowniejsza jest integracja jako lokalny serwis kontenerowy.

## Wykonane
- zweryfikowano lokalną kartę modelu i źródła producenta
- utworzono `CONTROL_CENTER/library-management/schematron-service/`
- dodano `app/main.py` (FastAPI extractor)
- dodano `Dockerfile` i `requirements.txt`
- dodano skrypty:
  - `scripts/dev/start_schematron_library_service.ps1`
  - `scripts/dev/stop_schematron_library_service.ps1`
  - `scripts/dev/test_schematron_library_service.ps1`
- zaktualizowano dokumentację `library-management` i mapy połączeń

## Uwaga techniczna
Diagnostyka IDE zgłasza brak importów `torch`, `fastapi`, `transformers`, `uvicorn` w pliku serwisu, ponieważ zależności nie są zainstalowane w aktywnym interpreterze VS Code. Są one jednak jawnie wpisane w `schematron-service/requirements.txt` i instalowane w kontenerze.
