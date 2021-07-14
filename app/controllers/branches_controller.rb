class BranchesController < FormController
  default_form_builder GOVUKDesignSystemFormBuilder::FormBuilder

  def new
  end

  def create
    branch = NewFlowBranchGenerator.new
    ServiceUpdater.new(service_metadata).tap do |service_updater|
      service_updater.add_branch(branch: branch.to_metadata, uuid: params[:uuid])
      service_updater.update
    end
    redirect_to edit_branch_path(service.id, branch.uuid)
  end

  def edit
    @branch = service.flow.find(params[:branch_id]) # branch flow uuid
    # get all the questions and answers etc
    # render  edit.html.erb
  end
end
