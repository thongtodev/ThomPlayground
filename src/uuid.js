// UUID v4 for both HTTPS and HTTP LAN testing.
export function randomId(cryptoApi = globalThis.crypto) {
 if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
 if (typeof cryptoApi?.getRandomValues !== 'function') throw new Error('Trình duyệt chưa hỗ trợ tạo mã. Bạn cập nhật trình duyệt nhé.');
 const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
 bytes[6] = (bytes[6] & 15) | 64;
 bytes[8] = (bytes[8] & 63) | 128;
 const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
