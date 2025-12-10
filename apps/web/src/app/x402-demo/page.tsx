import DemoClient from "./DemoClient";

export default function X402DemoPageServer() {
    // Read from server env (no NEXT_PUBLIC needed)
    const clientId = process.env.THIRDWEB_CLIENT_ID;

    if (!clientId) {
        return (
            <div className="p-8 text-red-500 bg-black min-h-screen">
                Error: THIRDWEB_CLIENT_ID not set in server environment variables.
            </div>
        );
    }

    return <DemoClient clientId={clientId} />;
}
