export type GraphTemplateSummary = {
  description: string;
  graphPath: string;
  templateId: string;
};

const graphTemplates: GraphTemplateSummary[] = [
  {
    description:
      "Canonical Federated Preview graph with a user node, planner runtime, relay resource profile, and package binding.",
    graphPath: "examples/federated-preview/graph.json",
    templateId: "federated-preview"
  }
];

export function listGraphTemplates(): GraphTemplateSummary[] {
  return [...graphTemplates];
}

export function getGraphTemplate(
  templateId: string
): GraphTemplateSummary | undefined {
  return graphTemplates.find((template) => template.templateId === templateId);
}
