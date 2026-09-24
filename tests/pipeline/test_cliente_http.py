# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import ssl
import unittest
import urllib.error

from pipeline.cliente_http import com_tentativas, contexto_tls_inep


class FalhaTemporaria:
    """Operação que falha com erro de rede nas primeiras chamadas."""

    def __init__(self, falhas: int) -> None:
        self.falhas = falhas
        self.chamadas = 0

    def __call__(self) -> str:
        self.chamadas += 1
        if self.chamadas <= self.falhas:
            raise urllib.error.URLError("reset")
        return "ok"


class ClienteHttpTeste(unittest.TestCase):
    def test_certificado_fora_do_pin_e_recusado(self) -> None:
        with self.assertRaisesRegex(ssl.SSLError, "SHA-256"):
            contexto_tls_inep(b"certificado forjado")

    def test_repete_ate_conseguir(self) -> None:
        operacao = FalhaTemporaria(falhas=2)
        self.assertEqual(com_tentativas(operacao, tentativas=3, espera=0), "ok")
        self.assertEqual(operacao.chamadas, 3)

    def test_relanca_depois_da_ultima_tentativa(self) -> None:
        with self.assertRaises(urllib.error.URLError):
            com_tentativas(FalhaTemporaria(falhas=5), tentativas=2, espera=0)
