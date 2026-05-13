export default function Showcase() {
  return (
    <section className="pb-32 px-10">
      <div className="max-w-full sm:max-w-[640px] mx-auto">
        {/* Mock UI Preview — flat, border only */}
        <div className="card-3d overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-5 py-3 bg-stripe-surface border-b border-stripe-border">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
            <div className="ml-4 flex-1 h-5 bg-white border border-stripe-border rounded text-[10px] font-mono text-stripe-body flex items-center px-3">
              bond.app/room/42
            </div>
          </div>
          {/* Mock deal content */}
          <div className="p-6 text-left bg-white">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-stripe-navy flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold font-mono">B</span>
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-stripe-navy">Room #42</div>
                  <div className="text-[12px] text-stripe-body">Landing page redesign</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider text-green-700 bg-green-50 border border-green-200">
                FUNDED
              </span>
            </div>

            {/* Price breakdown */}
            <div className="border border-stripe-border rounded-md mb-5">
              {[
                { label: 'Item price', value: '500.0 USDC' },
                { label: 'Tax (1%)', value: '5.0 USDC' },
                { label: 'Total in escrow', value: '505.0 USDC', bold: true },
              ].map((item, i) => (
                <div key={item.label} className={`flex justify-between text-[13px] px-4 py-2.5 ${i < 2 ? 'border-b border-stripe-border' : ''} ${item.bold ? 'font-medium' : ''}`}>
                  <span className="text-stripe-body">{item.label}</span>
                  <span className="text-stripe-navy font-mono">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Parties */}
            <div className="border border-stripe-border rounded-md mb-5">
              <div className="px-4 py-2 border-b border-stripe-border">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stripe-body">Parties</span>
              </div>
              {[
                { addr: '0xF871…7AF3', role: 'Seller', you: true },
                { addr: '0xAb12…9c34', role: 'Buyer', you: false },
              ].map((p, i) => (
                <div key={i} className={`flex justify-between items-center px-4 py-2.5 ${i === 0 ? 'border-b border-stripe-border' : ''}`}>
                  <div>
                    <span className="text-[13px] text-stripe-navy font-mono">{p.addr}</span>
                    {p.you && <span className="ml-2 text-[10px] text-purple-600 font-medium">(you)</span>}
                  </div>
                  <span className="text-[12px] text-stripe-body">{p.role}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <div className="flex-1 bg-stripe-navy text-white text-center py-2.5 rounded-md text-[13px] font-medium">Release</div>
              <div className="flex-1 bg-transparent border border-stripe-border text-stripe-body text-center py-2.5 rounded-md text-[13px] font-medium">Dispute</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
