# Login com o Google de verdade (RespiraKids)

Por padrão, no computador de desenvolvimento, o botão **Entrar com o Google** abre um
_Google de teste_ (uma lista de contas falsas: Maria, Dra. Ana etc.). Para cada pessoa entrar
com a **própria conta do Google**, o projeto precisa de uma "chave do app" do Google:
um **Client ID** e um **Client Secret**. É grátis e leva uns 5 minutos.

> A chave é da conta do Google de quem cria. Use uma conta do projeto RespiraKids
> (não a conta pessoal), para o grupo todo conseguir acessar depois.

## 1. Criar o projeto no Google Cloud

1. Abra <https://console.cloud.google.com/> e entre com a conta do projeto.
2. No topo, clique no seletor de projetos → **Novo projeto** → nome `RespiraKids` → **Criar**.

## 2. Tela de consentimento (o que aparece quando a pessoa entra)

1. Menu ☰ → **APIs e serviços** → **Tela de consentimento OAuth** (ou "Google Auth Platform").
2. Tipo de usuário: **Externo**.
3. Nome do app: `RespiraKids`. E-mail de suporte: o e-mail do projeto.
4. Escopos: deixe só os básicos (`email`, `profile`, `openid`). Não precisa de verificação do Google.
5. Enquanto estiver em **Teste**, só entram as contas que você adicionar em **Usuários de teste**
   (até 100). Para qualquer pessoa entrar (jurados, famílias), clique em **Publicar app**.

## 3. Criar a chave (Client ID)

1. **APIs e serviços** → **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**. Nome: `RespiraKids`.
3. **Origens JavaScript autorizadas**: `http://localhost:5173`
4. **URIs de redirecionamento autorizados** (no computador de desenvolvimento):
   `http://127.0.0.1:3211/api/auth/callback/google`
5. Clique em **Criar**. Aparecem o **ID do cliente** e a **Chave secreta do cliente**.

> Quando o site for publicado, volte aqui e adicione também o endereço público
> (ex.: `https://SEU-PROJETO.convex.site/api/auth/callback/google` e a origem do site).

## 4. Colocar a chave no projeto

No terminal, dentro da pasta do projeto, com o projeto rodando (`pnpm.cmd run dev:all` em outra aba):

```powershell
npx convex env set AUTH_GOOGLE_ID "COLE-AQUI-O-ID-DO-CLIENTE"
npx convex env set AUTH_GOOGLE_SECRET "COLE-AQUI-A-CHAVE-SECRETA"
npx convex env remove AUTH_GOOGLE_EMULATE_URL
```

Pronto: o botão **Entrar com o Google** passa a abrir o Google de verdade.

**Nunca** coloque a chave secreta no código, no GitHub ou em grupo de WhatsApp.
Ela fica só no Convex (o comando acima guarda lá).

## Voltar para o Google de teste

```powershell
npx convex env remove AUTH_GOOGLE_ID
npx convex env remove AUTH_GOOGLE_SECRET
pnpm.cmd run setup
```
