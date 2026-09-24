# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from pipeline.arquivos import SistemaArquivosLocal


class SistemaArquivosLocalTeste(unittest.TestCase):
    def test_grava_e_le(self) -> None:
        arquivos = SistemaArquivosLocal()
        with tempfile.TemporaryDirectory() as pasta:
            arquivos.gravar_json(f"{pasta}/a/b.json", {"nome": "São Gonçalo"})
            self.assertEqual(json.loads(Path(pasta, "a/b.json").read_text(encoding="utf-8")), {"nome": "São Gonçalo"})
            Path(pasta, "t.csv").write_bytes("Niterói\n".encode("latin-1"))
            self.assertEqual(list(arquivos.ler_linhas(f"{pasta}/t.csv")), ["Niterói\n"])
            self.assertEqual(arquivos.listar(pasta), ["a", "t.csv"])

    def test_le_membro_zip(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            caminho = f"{pasta}/x.zip"
            with zipfile.ZipFile(caminho, "w") as pacote:
                pacote.writestr("xl/a.xml", "<a/>")
            self.assertEqual(SistemaArquivosLocal().ler_membro_zip(caminho, "xl/a.xml"), b"<a/>")

    def test_extrair_buscar_e_jsonl(self) -> None:
        arquivos = SistemaArquivosLocal()
        with tempfile.TemporaryDirectory() as pasta:
            caminho = f"{pasta}/x.zip"
            with zipfile.ZipFile(caminho, "w") as pacote:
                pacote.writestr("m/ANEXO I - Dic/d.xlsx", "x")
            arquivos.extrair_zip(caminho, f"{pasta}/e")
            self.assertEqual(arquivos.buscar(f"{pasta}/e", "*anexo i *.xlsx"), [f"{pasta}/e/m/ANEXO I - Dic/d.xlsx"])
            self.assertEqual(arquivos.listar_membros_zip(caminho), ["m/ANEXO I - Dic/d.xlsx"])
            arquivos.gravar_jsonl_gz(f"{pasta}/f.jsonl.gz", [{"a": 1}, {"b": "ç"}])
            self.assertEqual(list(arquivos.ler_jsonl_gz(f"{pasta}/f.jsonl.gz")), [{"a": 1}, {"b": "ç"}])
            self.assertTrue(arquivos.existe(caminho))
            arquivos.gravar_json(f"{pasta}/j.json", [1])
            self.assertEqual(arquivos.ler_json(f"{pasta}/j.json"), [1])
