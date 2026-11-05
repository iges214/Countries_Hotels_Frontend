import { useState } from "react";
import { Archive, Check, Inbox, Mail, Send } from "lucide-react";
import { ErrorBox, Loading } from "../components";
import { useData } from "../hooks";
import { adminApi, type HotelMessage } from "./api";
import { useAdmin } from "./context";
import {
  Badge,
  Card,
  date,
  EmptyState,
  matches,
  PageTitle,
  SearchBox,
  Tabs,
  useAction,
} from "./ui";

export function Messages() {
  const { branch } = useAdmin();
  const data = useData<
    [
      HotelMessage[],
      { replyConfigured: boolean; incomingEmailConnected: boolean },
    ]
  >(
    () =>
      branch
        ? Promise.all([
            adminApi.messages(branch.id),
            adminApi.mailStatus(branch.id),
          ])
        : Promise.resolve([
            [],
            { replyConfigured: false, incomingEmailConnected: false },
          ]),
    [branch?.id],
  );
  const [folder, setFolder] = useState("inbox");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number>();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [requests, setRequests] = useState<Record<number, string>>({});
  const action = useAction();
  const messages = data.data?.[0] || [];
  const mail = data.data?.[1];
  const inbox = messages.filter((m) => !m.isArchived);
  const unread = inbox.filter((m) => !m.isRead);
  const filtered = messages.filter(
    (m) =>
      (folder === "archived" ? m.isArchived : !m.isArchived) &&
      ((filter !== "unread" && folder !== "unread") || !m.isRead) &&
      filter !== "email" &&
      matches(
        m.subject + " " + m.senderName + " " + m.senderEmail + " " + m.body,
        search,
      ),
  );
  const message = filtered.find((m) => m.id === selected) || filtered[0];
  const setState = async (read: boolean, archived: boolean) => {
    if (!message || !branch) return;
    await action.run(
      async () => {
        await adminApi.messageState(branch.id, message.id, read, archived);
        data.retry();
      },
      archived
        ? "Message archived."
        : read
          ? "Message marked as read."
          : "Message updated.",
    );
  };
  return (
    <>
      <PageTitle
        title="Messages & emails"
        description="Conversations sent to your hotel."
      />
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: inbox.length },
          { value: "unread", label: "Unread", count: unread.length },
          { value: "email", label: "Email" },
          { value: "website", label: "Website messages" },
        ]}
      />
      <div className="ad-note">
        <Mail size={18} />
        <span>
          Website enquiries arrive here. Incoming email is not connected.
          {mail &&
            !mail.replyConfigured &&
            " Email replies become available when hotel mail delivery is configured."}
        </span>
      </div>
      <ErrorBox error={data.error} retry={data.retry} />
      {action.feedback}
      {data.loading ? (
        <Loading />
      ) : (
        !data.error && (
          <div className="ad-inbox">
            <div className="ad-folders">
              {[
                ["inbox", "Inbox", inbox.length, Inbox],
                ["unread", "Unread", unread.length, Mail],
                [
                  "archived",
                  "Archived",
                  messages.filter((m) => m.isArchived).length,
                  Archive,
                ],
              ].map(([value, label, count, Icon]) => {
                const FolderIcon = Icon as typeof Inbox;
                return (
                  <button
                    key={String(value)}
                    className={folder === value ? "active" : ""}
                    onClick={() => setFolder(String(value))}
                  >
                    <FolderIcon size={17} />
                    <span>{String(label)}</span>
                    <Badge>{String(count)}</Badge>
                  </button>
                );
              })}
            </div>
            <div className="ad-conversations">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search messages"
              />
              {filtered.map((m) => (
                <button
                  className={
                    "ad-conversation " +
                    (m.id === message?.id ? "selected" : "")
                  }
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                >
                  <span
                    className={"ad-read-dot " + (!m.isRead ? "unread" : "")}
                  />
                  <span className="ad-avatar">{m.senderName[0]}</span>
                  <div>
                    <strong>{m.senderName}</strong>
                    <small>
                      {date(m.receivedAt, branch?.timeZoneId, true)}
                    </small>
                    <span>{m.subject}</span>
                    <Badge tone="green">Website message</Badge>
                  </div>
                </button>
              ))}
              {!filtered.length && (
                <EmptyState
                  title={
                    filter === "email"
                      ? "Email inbox not connected"
                      : "No messages here"
                  }
                >
                  <p>
                    {filter === "email"
                      ? "Connect an incoming mail provider before email conversations can appear."
                      : "Enquiries submitted through the hotel contact page will appear here."}
                  </p>
                </EmptyState>
              )}
            </div>
            <div className="ad-thread">
              {message ? (
                <>
                  <div className="ad-thread-heading">
                    <h2>{message.subject}</h2>
                    <div className="ad-actions">
                      <button
                        className="ad-btn small"
                        disabled={action.busy}
                        onClick={() =>
                          setState(!message.isRead, message.isArchived)
                        }
                      >
                        <Check size={15} />
                        {message.isRead ? "Mark unread" : "Mark as read"}
                      </button>
                      <button
                        className="ad-btn small"
                        disabled={action.busy}
                        onClick={() =>
                          setState(message.isRead, !message.isArchived)
                        }
                      >
                        <Archive size={15} />
                        {message.isArchived ? "Move to inbox" : "Archive"}
                      </button>
                    </div>
                  </div>
                  <Badge tone="green">Website message</Badge>
                  <dl className="ad-message-meta">
                    <dt>From</dt>
                    <dd>
                      {message.senderName} &lt;{message.senderEmail}&gt;
                    </dd>
                    <dt>Received</dt>
                    <dd>
                      {date(message.receivedAt, branch?.timeZoneId, true)} ·{" "}
                      {branch?.timeZoneId}
                    </dd>
                  </dl>
                  <div className="ad-message-body">{message.body}</div>
                  {message.replies.map((reply) => (
                    <div className="ad-reply" key={reply.id}>
                      <div>
                        <strong>Hotel reply</strong>
                        <Badge
                          tone={
                            reply.deliveryStatus === "Sent" ? "green" : "red"
                          }
                        >
                          {reply.deliveryStatus}
                        </Badge>
                      </div>
                      <small>
                        {date(reply.createdAt, branch?.timeZoneId, true)}
                      </small>
                      <p>{reply.body}</p>
                    </div>
                  ))}
                  <Card title="Reply">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!branch || !drafts[message.id]?.trim()) return;
                        const requestId =
                          requests[message.id] || crypto.randomUUID();
                        setRequests((r) => ({ ...r, [message.id]: requestId }));
                        await action.run(async () => {
                          const result = await adminApi.reply(
                            branch.id,
                            message.id,
                            drafts[message.id].trim(),
                            requestId,
                          );
                          if (result.deliveryStatus === "Sent") {
                            setDrafts((d) => ({ ...d, [message.id]: "" }));
                            setRequests((r) => {
                              const next = { ...r };
                              delete next[message.id];
                              return next;
                            });
                          }
                          data.retry();
                        }, "Reply submitted. Review its delivery status in the conversation.");
                      }}
                    >
                      <label className="ad-field">
                        <span className="sr-only">Reply message</span>
                        <textarea
                          rows={5}
                          maxLength={10000}
                          placeholder="Write your response…"
                          disabled={!mail?.replyConfigured}
                          value={drafts[message.id] || ""}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [message.id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      {!mail?.replyConfigured && (
                        <p className="ad-fine">
                          Reply delivery is not configured for this
                          installation.
                        </p>
                      )}
                      <button
                        className="ad-btn gold"
                        disabled={
                          action.busy ||
                          !mail?.replyConfigured ||
                          !drafts[message.id]?.trim()
                        }
                      >
                        <Send size={16} />
                        {action.busy ? "Sending…" : "Send reply"}
                      </button>
                      {requests[message.id] && (
                        <p className="ad-fine">
                          This submission has a saved request ID. Refresh the
                          conversation to check delivery before submitting
                          again.
                        </p>
                      )}
                    </form>
                  </Card>
                </>
              ) : (
                <EmptyState title="Select a conversation">
                  <p>Choose a message to read its details.</p>
                </EmptyState>
              )}
            </div>
          </div>
        )
      )}
    </>
  );
}
