class PagesController < FormController
  default_form_builder GOVUKDesignSystemFormBuilder::FormBuilder
  before_action :assign_required_objects, only: [:edit, :update]

  def create
    @page_creation = PageCreation.new(page_creation_params)

    if @page_creation.create
      redirect_to edit_page_path(service_id, @page_creation.page_uuid)
    else
      render template: 'services/edit', status: :unprocessable_entity
    end
  end

  def update
    @metadata_updater = MetadataUpdater.new(page_update_params)

    if @metadata_updater.update
      redirect_to edit_page_path(service.service_id, params[:page_uuid])
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def page_creation_params
    params.require(
      :page
    ).permit(
      :page_url, :page_type, :component_type
    ).merge(common_params)
  end

  def page_update_params
    update_params = ActiveSupport::HashWithIndifferentAccess.new({
      id: @page.id
    }.merge(common_params).merge(page_attributes))

    if update_params[:components]
      update_params[:components] = update_params[:components].each.map do |_,value|
        JSON.parse(value)
      end
    end

    update_params
  end

  def page_attributes
    params.require(:page).permit(
      @page.editable_attributes.keys.push({ components: {}})
    )
  end

  def common_params
    {
      latest_metadata: service_metadata,
      service_id: service_id
    }
  end

  def service_id
    service.service_id
  end

  def change_answer_path(url:)
    ''
  end
  helper_method :change_answer_path

  def reserved_submissions_path
    ''
  end
  helper_method :reserved_submissions_path

  private

  # The metadata presenter gem requires this objects to render a page
  #
  def assign_required_objects
    @page = service.find_page_by_uuid(params[:page_uuid])
    @page_answers = MetadataPresenter::PageAnswers.new(@page, {})
  end
end
