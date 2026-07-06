import { Frame, Label } from "@/components/Frame";
import { Stamp } from "@/components/Stamp";
import { LinkButton } from "@/components/Button";
import { NETWORK, PROTOCOL_FEE_BPS } from "@/lib/config";
import { Wordmark, GitHubIcon, GITHUB_URL } from "@/components/icons";

function Nav() {
  return (
    <nav className="sticky top-0 z-20 border-b-2 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <a href="/" aria-label="BountyFrame home">
          <Wordmark />
        </a>
        <div className="hidden items-center gap-6 font-mono text-xs uppercase tracking-widest md:flex">
          <a href="#how" className="hover:text-coral">How it works</a>
          <a href="#brands" className="hover:text-coral">Brands</a>
          <a href="#creators" className="hover:text-coral">Creators</a>
          <a href="#developers" className="hover:text-coral">Developers</a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="BountyFrame on GitHub"
            className="text-ink transition-colors hover:text-coral"
          >
            <GitHubIcon className="h-6 w-6" />
          </a>
          <LinkButton href="/app" variant="ink" className="!px-4 !py-2">
            Open app
          </LinkButton>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="scanlines border-b-2 border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <Label>
            <span className="text-volt">On-chain payouts, judged by AI</span>
          </Label>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tightest md:text-7xl">
            Post the content.
            <br />
            Get the stamp.
            <br />
            <span className="text-volt">Get paid.</span>
          </h1>
          <p className="mt-6 max-w-xl font-body text-lg text-paper/80">
            Brands fund a campaign and write the creative guidelines in plain
            language. Creators submit a link to their post. A GenLayer contract
            fetches the media, checks it against the guidelines, and releases the
            bounty when the validators agree.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <LinkButton href="/app" variant="volt">
              Open app
            </LinkButton>
            <LinkButton href="#how" variant="ghost" className="!text-paper !border-paper">
              How it works
            </LinkButton>
          </div>
        </div>

        <div className="relative">
          <Frame className="bg-ink-2 p-6 text-paper">
            <Label>
              <span className="text-paper/60">submission #204</span>
            </Label>
            <div className="mt-3 aspect-[4/3] w-full rounded-sharp border-2 border-paper/20 bg-[repeating-linear-gradient(45deg,#26262e_0_10px,#1b1b21_10px_20px)]" />
            <p className="mt-4 font-mono text-xs text-paper/70">
              guideline: &quot;can visible, sunny beach, no competing brands&quot;
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Stamp verdict="paid" />
              <span className="font-mono text-sm text-volt">+0.95 GEN</span>
            </div>
          </Frame>
        </div>
      </div>
    </header>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Frame className="p-6">
      <div className="font-mono text-4xl font-bold text-coral">{n}</div>
      <h3 className="mt-3 font-display text-xl font-bold tracking-tightest">
        {title}
      </h3>
      <p className="mt-2 text-ink-60">{children}</p>
    </Frame>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-20">
      <Label>How it works</Label>
      <h2 className="mt-2 max-w-2xl font-display text-4xl font-bold tracking-tightest">
        A campaign runs end to end without a human reviewing submissions.
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Step n="01" title="Brand funds a campaign">
          The brand deposits GEN into escrow and writes the creative guidelines as
          plain text. The deposit sets how many bounties the campaign can pay.
        </Step>
        <Step n="02" title="Creator submits a link">
          A creator posts their content and submits the image URL. One payout per
          creator per campaign keeps the queue honest.
        </Step>
        <Step n="03" title="Validators judge and pay">
          Each validator fetches the media, runs the vision model against the
          guidelines, and votes. A majority decides. Approved content is paid
          instantly, minus a {PROTOCOL_FEE_BPS / 100}% protocol fee.
        </Step>
      </div>
    </section>
  );
}

function WhyGenLayer() {
  return (
    <section className="border-y-2 border-ink bg-paper-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[1fr_1.2fr] md:items-start">
        <h2 className="font-display text-3xl font-bold tracking-tightest">
          Why the judgment runs on GenLayer
        </h2>
        <div className="space-y-4 text-ink-60">
          <p>
            Deciding whether an image matches a brand&apos;s guidelines is a
            subjective call. A normal smart contract cannot make it. A single AI
            API reintroduces a company you have to trust.
          </p>
          <p>
            GenLayer runs the evaluation inside the contract. Each validator
            independently fetches the media, runs the model against the same
            guidelines, and votes. The payout follows the consensus, not one
            server&apos;s opinion. If a result looks wrong, anyone can appeal it.
          </p>
        </div>
      </div>
    </section>
  );
}

function Audiences() {
  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-5 py-20 md:grid-cols-2">
      <Frame id="brands" as="div" className="p-8">
        <Label>For brands</Label>
        <h3 className="mt-2 font-display text-2xl font-bold tracking-tightest">
          Run a thousand micro-creators like one ad set.
        </h3>
        <ul className="mt-4 space-y-2 text-ink-60 list-disc pl-5 marker:text-coral">
          <li>Deposit GEN and write the guidelines once.</li>
          <li>No manual review, no account managers.</li>
          <li>Reclaim unspent escrow any time you close the campaign.</li>
        </ul>
      </Frame>
      <Frame id="creators" as="div" className="p-8">
        <Label>For creators</Label>
        <h3 className="mt-2 font-display text-2xl font-bold tracking-tightest">
          Submit a link. Get paid on approval.
        </h3>
        <ul className="mt-4 space-y-2 text-ink-60 list-disc pl-5 marker:text-coral">
          <li>No contracts to negotiate, no invoicing.</li>
          <li>The same guidelines are applied to everyone.</li>
          <li>Payout lands in your wallet when validators agree.</li>
        </ul>
      </Frame>
    </section>
  );
}

function Developers() {
  const methods: [string, string][] = [
    ["create_campaign(title, guidelines, bounty_amount)", "payable, escrow GEN"],
    ["fund_campaign(campaign_id)", "payable, top up escrow"],
    ["submit(campaign_id, media_url)", "AI verdict + payout"],
    ["close_campaign(campaign_id)", "brand refund"],
    ["get_campaign(id) / get_submission(id)", "read state"],
  ];
  return (
    <section id="developers" className="border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <Label>
          <span className="text-volt">Developers</span>
        </Label>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tightest">
          One Python contract owns the money and the decision.
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-paper/60">
              Contract methods
            </h3>
            <div className="mt-3 divide-y divide-paper/10 border-2 border-paper/20 rounded-sharp">
              {methods.map(([sig, note]) => (
                <div key={sig} className="flex flex-col gap-1 p-3 md:flex-row md:justify-between">
                  <code className="font-mono text-sm text-volt">{sig}</code>
                  <span className="font-mono text-xs text-paper/50">{note}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-paper/70">
              Consensus rule: the leader fetches the image and returns a JSON
              verdict. Every validator re-runs the check and agrees only if the
              boolean <code className="text-volt">compliant</code> decision matches.
              That is the majority vote that authorizes the payout.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-paper/60">
              Network: {NETWORK.name} only
            </h3>
            <div className="mt-3 border-2 border-paper/20 rounded-sharp">
              {[
                ["RPC", NETWORK.rpc],
                ["Chain ID", String(NETWORK.chainId)],
                ["Currency", NETWORK.currency],
                ["Explorer", NETWORK.explorer],
                ["Faucet", NETWORK.faucet],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-paper/10 p-3 last:border-0">
                  <span className="font-mono text-xs uppercase tracking-widest text-paper/50">{k}</span>
                  <span className="truncate font-mono text-sm text-paper">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-paper/70">
              Fund a wallet from the faucet, then open the app and connect. The app
              reads the contract address from its environment configuration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 md:flex-row">
        <Wordmark />
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-60">
            Runs on {NETWORK.name}. Judgment by validator consensus.
          </span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="BountyFrame on GitHub"
            className="text-ink transition-colors hover:text-coral"
          >
            <GitHubIcon className="h-6 w-6" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <HowItWorks />
      <WhyGenLayer />
      <Audiences />
      <Developers />
      <Footer />
    </main>
  );
}
