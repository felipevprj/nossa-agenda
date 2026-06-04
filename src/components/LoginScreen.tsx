import { useState } from "react";
import { entrarNaAgenda } from "../lib/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const entrar = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !senha.trim()) {
      setErro("Informe e-mail e senha para entrar.");
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      await entrarNaAgenda(email.trim(), senha);
    } catch (error) {
      console.error("Erro no login:", error);
      setErro("Não foi possível entrar. Verifique e-mail e senha.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <h1 className="text-2xl font-bold mb-2">Agenda FF</h1>

        <p className="text-sm text-gray-500 mb-6">
          Entre para acessar a agenda da família.
        </p>

        <label className="block text-sm font-semibold mb-2">
          E-mail
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent outline-none focus:border-blue-500"
          placeholder="seuemail@email.com"
        />

        <label className="block text-sm font-semibold mb-2">
          Senha
        </label>

        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent outline-none focus:border-blue-500"
          placeholder="Digite sua senha"
        />

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl mb-4">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}