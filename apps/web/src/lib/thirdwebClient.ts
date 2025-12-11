import { createThirdwebClient } from "thirdweb";

export function createBrowserThirdwebClient(clientId?: string) {
    const finalClientId =
        clientId ||
        process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ||
        process.env.THIRDWEB_CLIENT_ID;

    if (!finalClientId) {
        // We don't throw immediately, letting the caller handle it or thirdweb client throw.
        // unlikely to work without it though.
        console.warn("No Client ID found for Thirdweb client");
    }

    return createThirdwebClient({
        clientId: finalClientId || "", // prevent crash, though it will fail calls
    });
}

export const client = createBrowserThirdwebClient();
