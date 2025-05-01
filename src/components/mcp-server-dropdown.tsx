"use client";
import {
  connectMcpClientAction,
  disconnectMcpClientAction,
  refreshMcpClientAction,
  selectMcpClientsAction,
} from "@/app/api/mcp/actions";
import { appStore } from "@/app/store";
import { MCPServerInfo } from "app-types/mcp";
import { ChevronRight, RotateCw, Loader } from "lucide-react";
import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "ui/card";

import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { Switch } from "ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { handleErrorWithToast } from "ui/shared-toast";

import { Button } from "ui/button";
import { safe } from "ts-safe";
import { ToolDetailPopup } from "./tool-detail-popup";
import { Separator } from "ui/separator";

import { cn } from "lib/utils";
import { MCPIcon } from "ui/mcp-icon";

type McpServerDropDownProps = {
  align?: "start" | "end";
};

export const McpServerDropDown = ({
  children,
  align = "start",
}: PropsWithChildren<McpServerDropDownProps>) => {
  const appStoreMutate = appStore((state) => state.mutate);

  const [open, setOpen] = useState(false);
  const [expandedServers, setExpandedServers] = useState<string[]>([]);

  const [processingItems, setProcessingItems] = useState<string[]>([]);

  const { data: mcpList, mutate: refreshMcpList } = useSWR(
    "mcp-list",
    selectMcpClientsAction,
    {
      refreshInterval: 1000 * 30 * 1,
      fallbackData: [],
      onError: handleErrorWithToast,
      onSuccess: (data) => appStoreMutate({ mcpList: data }),
    },
  );

  useEffect(() => {
    if (open) {
      refreshMcpList();
    }
  }, [open]);

  const pipeProcessing = useCallback(
    async (name: string, fn: () => Promise<any>) =>
      safe(() => setProcessingItems((prev) => [...prev, name]))
        .ifOk(fn)
        .ifOk(() => refreshMcpList())
        .ifFail(handleErrorWithToast)
        .watch(() =>
          setProcessingItems((prev) => prev.filter((n) => n !== name)),
        ),
    [],
  );

  const handleToggleConnection = useCallback(
    async (server: MCPServerInfo) => {
      await pipeProcessing(server.name, () =>
        server.status === "connected"
          ? disconnectMcpClientAction(server.name)
          : connectMcpClientAction(server.name),
      );
    },
    [pipeProcessing],
  );

  const handleRefresh = useCallback(
    (server: MCPServerInfo) =>
      pipeProcessing(server.name, () => refreshMcpClientAction(server.name)),
    [pipeProcessing],
  );

  const toggleServerExpansion = (serverName: string) => {
    setExpandedServers((prev) =>
      prev.includes(serverName)
        ? prev.filter((name) => name !== serverName)
        : [...prev, serverName],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="p-0 border-none  w-full md:w-[400px] overflow-hidden"
        align={align}
        side="top"
      >
        <Card
          className="relative w-full py-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <CardContent className="p-0 flex">
            <div className="flex-1 h-[50vh] overflow-y-auto w-full ">
              <div className="p-6 sticky top-0 z-10 w-full bg-card">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    MCP Servers
                  </h4>
                </div>
              </div>

              <div className="p-6 pt-0 w-full">
                {mcpList && mcpList.length > 0 ? (
                  <div className={cn("space-y-2 w-full")}>
                    {mcpList.map((server) => (
                      <div
                        key={server.name}
                        className={cn(
                          processingItems.includes(server.name)
                            ? "opacity-50 pointer-events-none"
                            : "",

                          "bg-secondary rounded-md border shadow-sm text-xs hover:bg-secondary",
                        )}
                      >
                        <div
                          className="flex items-center py-2 px-4 cursor-pointer"
                          onClick={() => toggleServerExpansion(server.name)}
                        >
                          <span className="font-medium">{server.name}</span>
                          <div className="mx-2">
                            {processingItems.includes(server.name) ? (
                              <div className="flex items-center gap-2">
                                <Loader className="size-3.5 animate-spin" />
                              </div>
                            ) : server.error ? (
                              <div className="flex items-center gap-1 text-destructive bg-card rounded-md px-2 py-1">
                                error
                              </div>
                            ) : null}
                          </div>
                          <div className="flex-1" />
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Switch
                                  className={
                                    server.status == "connected"
                                      ? "bg-accent-foreground"
                                      : "bg-card"
                                  }
                                  id={`mcp-server-${server.name}`}
                                  checked={server.status === "connected"}
                                  onCheckedChange={() => {
                                    handleToggleConnection(server);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Toggle Connection</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="h-4 pl-2">
                              <Separator orientation="vertical" />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRefresh(server);
                                  }}
                                >
                                  <RotateCw className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Refresh</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="h-4 pl-2">
                              <Separator orientation="vertical" />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronRight
                                    className={cn(
                                      "size-3.5 transition-transform duration-200",
                                      expandedServers.includes(server.name) &&
                                        "rotate-90",
                                    )}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Detail</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {expandedServers.includes(server.name) && (
                          <div className="p-2 pt-0 border-t mt-1 w-full">
                            <div className="space-y-1 py-2">
                              {server.toolInfo && server.toolInfo.length > 0 ? (
                                server.toolInfo.map((tool) => (
                                  <ToolDetailPopup key={tool.name} tool={tool}>
                                    <div className="flex cursor-pointer bg-secondary/50 rounded-md p-2 hover:bg-background/80 transition-colors">
                                      <div className="flex-1 w-full">
                                        <p className="font-medium text-xs mb-1">
                                          {tool.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                          {tool.description}
                                        </p>
                                      </div>
                                      <div className="flex items-center px-1 justify-center self-stretch">
                                        <ChevronRight size={14} />
                                      </div>
                                    </div>
                                  </ToolDetailPopup>
                                ))
                              ) : (
                                <div className="text-center py-2 text-muted-foreground">
                                  No tools available for this server
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Connect to MCP servers and use their tools
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
