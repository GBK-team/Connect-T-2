import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "mobile/app/(tabs)/admin.tsx");
let source = fs.readFileSync(file, "utf8");

const misplaced = `      <ConfirmActionModal
        visible={accountActions.pendingAction === "logout"}
        title="Logout from Connect-T?"
        message="This will securely clear Civic and Job Portal sessions on this device. Complaints, alerts and account data will remain saved."
        confirmLabel="Logout"
        icon="log-out"
        tone="danger"
        busy={accountActions.busy}
        onCancel={accountActions.cancelAction}
        onConfirm={accountActions.runPendingAction}
      />
`;

if (!source.includes(misplaced)) throw new Error("Misplaced logout modal was not found");
source = source.replace(misplaced, "");

const closing = `          </Modal>
        </View>
      </Modal>

    </View>
  );
}`;
const corrected = `          </Modal>
        </View>
      </Modal>

      <ConfirmActionModal
        visible={accountActions.pendingAction === "logout"}
        title="Logout from Connect-T?"
        message="This will securely clear Civic and Job Portal sessions on this device. Complaints, alerts and account data will remain saved."
        confirmLabel="Logout"
        icon="log-out"
        tone="danger"
        busy={accountActions.busy}
        onCancel={accountActions.cancelAction}
        onConfirm={accountActions.runPendingAction}
      />
    </View>
  );
}`;

if (!source.includes(closing)) throw new Error("Admin component closing block was not found");
source = source.replace(closing, corrected);
fs.writeFileSync(file, source);
console.log("Nagarsevak logout confirmation moved to the authenticated dashboard root.");
