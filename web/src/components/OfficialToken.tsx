import { explorerAddress } from "@/lib/config";
import { getOfficialToken, montraUrl, OFFICIAL } from "@/lib/officialToken";
import { CopyAddress } from "./CopyAddress";

/** Shows the official $ELYPORT contract once it exists on-chain; until then, a clear warning. */
export async function OfficialToken({ compact }: { compact?: boolean }) {
  const t = await getOfficialToken().catch(() => null);
  return (
    <div className={`official${compact ? " compact" : ""}`}>
      <div className="official-head">
        <span className="official-ticker">${OFFICIAL.symbol}</span>
        <span className={`official-pill ${t ? "live" : ""}`}>{t ? "Official · live" : "Launching soon on Montra"}</span>
      </div>
      {t ? (
        <>
          <CopyAddress address={t.address} />
          <div className="official-links">
            <a href={montraUrl(t.address)} target="_blank" rel="noreferrer">Trade on Montra ↗</a>
            <a href={explorerAddress(t.address)} target="_blank" rel="noreferrer">Explorer ↗</a>
          </div>
          <p className="official-note">
            Detected on-chain: launched through Montra by the Elyport dev wallet. Any other address using the name is not ours.
          </p>
        </>
      ) : (
        <p className="official-note">
          The official contract address will appear here automatically the moment it is launched from the Elyport dev wallet.
          Until then, any address you see posted is fake.
        </p>
      )}
    </div>
  );
}
