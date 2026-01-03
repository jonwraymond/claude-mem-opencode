export default function plugin(input: {
    client: any;
    project: any;
    directory: string;
    worktree: string;
    serverUrl: URL;
    $: any;
}): Promise<{
    event: ({ event }: {
        event: any;
    }) => Promise<void>;
}>;
//# sourceMappingURL=plugin.d.ts.map