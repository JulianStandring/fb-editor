class BranchesController < FormController
  default_form_builder GOVUKDesignSystemFormBuilder::FormBuilder

  def new
    @branch = Branch.new(previous_flow_object: previous_flow_object, service: service)
    
  end

  def create
    branch_creation = BranchCreation.new(branch_params)
    if branch_creation.create
      redirect_to edit_branch_path(service.service_id, branch_creation.branch_uuid)
    else
      render :new
    end
  end

  def edit
    @branch = service.flow.find(params[:flow_uuid]) # branch flow uuid
    # get all the questions and answers etc
    # render  edit.html.erb
  end

  def previous_flow_object
    service.find_page_by_uuid(params[:flow_uuid]) ||
      service.flow_object(params[:flow_uuid])
  end

  def branch_params
    {
      service_id: service.service_id,
      latest_metadata: service_metadata,
      previous_flow_uuid: params[:branch][:flow_uuid]
    }
  end
end
